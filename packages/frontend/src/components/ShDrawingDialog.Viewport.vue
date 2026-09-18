<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div
	ref="rootEl"
	:class="[$style.root, { [$style.hand]: tool === 'hand', [$style.panning]: gesture?.type === 'pan' }]"
	@pointerdown="onPointerDown"
	@pointermove="onPointerMove"
	@pointerup="onPointerUp"
	@pointercancel="onPointerCancel"
	@lostpointercapture="onPointerCancel"
	@wheel.prevent="onWheel"
	@contextmenu.prevent
>
	<div :class="[$style.stage, { [$style.checkered]: spec.background == null }]" :style="stageStyle">
		<canvas
			ref="canvasEl"
			:class="[$style.canvas, { [$style.pixelated]: view.zoom >= 1 }]"
			:width="spec.width"
			:height="spec.height"
			role="img"
			:aria-label="i18n.ts._shDrawing.canvas"
		></canvas>
		<canvas
			ref="overlayEl"
			:class="[$style.canvas, $style.overlay, { [$style.pixelated]: view.zoom >= 1 }]"
			:width="spec.width"
			:height="spec.height"
		></canvas>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import type { DrawingCanvasSpec, DrawingSettings, DrawingToolKind, Point, StrokePoint } from '@/utility/drawing/types.js';
import type { DrawingTool } from '@/utility/drawing/tools.js';
import type { ViewportState } from '@/utility/drawing/viewport.js';
import { createDrawingTool } from '@/utility/drawing/tools.js';
import { clientToCanvas, fitZoom, zoomAt } from '@/utility/drawing/viewport.js';
import { isPressureCapable, resolvePressure } from '@/utility/drawing/pressure.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	tool: DrawingToolKind;
	settings: DrawingSettings;
	spec: DrawingCanvasSpec;
}>();

const emit = defineEmits<{
	(ev: 'ready', snapshot: ImageData): void;
	(ev: 'commit', snapshot: ImageData): void;
	(ev: 'pickColor', hex: string): void;
}>();

type Gesture =
	| { type: 'draw'; pointerId: number; pressureCapable: boolean; }
	| { type: 'pan'; pointerId: number; last: Point; }
	| { type: 'pinch'; startDistance: number; startMid: Point; startView: ViewportState; };

const rootEl = useTemplateRef('rootEl');
const canvasEl = useTemplateRef('canvasEl');
const overlayEl = useTemplateRef('overlayEl');

const view = ref<ViewportState>({ zoom: 1, panX: 0, panY: 0 });
const gesture = shallowRef<Gesture | null>(null);
/** 押下中のポインタのクライアント座標 */
const pointers = new Map<number, Point>();

let ctx: CanvasRenderingContext2D | null = null;
let overlayCtx: CanvasRenderingContext2D | null = null;
let activeTool: DrawingTool | null = null;

const stageStyle = computed(() => ({
	width: `${props.spec.width}px`,
	height: `${props.spec.height}px`,
	transform: `translate(-50%, -50%) translate(${view.value.panX}px, ${view.value.panY}px) scale(${view.value.zoom})`,
}));

function clearCanvas(target: CanvasRenderingContext2D) {
	target.clearRect(0, 0, target.canvas.width, target.canvas.height);
}

function snapshot(): ImageData {
	return ctx!.getImageData(0, 0, props.spec.width, props.spec.height);
}

function rebuildTool() {
	activeTool?.cancel();
	if (ctx == null || overlayCtx == null) return;
	activeTool = createDrawingTool(props.tool, {
		ctx,
		overlayCtx,
		getSettings: () => props.settings,
		getBackground: () => props.spec.background,
		commit: () => emit('commit', snapshot()),
		pickColor: hex => emit('pickColor', hex),
	});
}

watch(() => props.tool, () => {
	gesture.value = null;
	rebuildTool();
});

/** ビューポート中心を原点とした座標に変換する */
function toViewportCentered(client: Point): Point {
	const rect = rootEl.value!.getBoundingClientRect();
	return {
		x: client.x - (rect.left + rect.width / 2),
		y: client.y - (rect.top + rect.height / 2),
	};
}

function toCanvasPoint(client: Point): Point {
	return clientToCanvas(client, canvasEl.value!.getBoundingClientRect(), props.spec.width, props.spec.height);
}

/**
 * ポインタの位置と筆圧を、描画ツールに渡す形にする。
 *
 * 筆圧を取れているかはストローク単位で覚える (draw ジェスチャの pressureCapable)。
 * ペンを離す瞬間は 0 が飛んでくるので、サンプル単位で判定してはいけない
 */
function toStrokePoint(ev: { clientX: number; clientY: number; pressure: number; pointerType: string; }): StrokePoint {
	const g = gesture.value;
	if (g?.type === 'draw' && !g.pressureCapable && isPressureCapable(ev.pointerType, ev.pressure)) {
		g.pressureCapable = true;
	}

	return {
		...toCanvasPoint({ x: ev.clientX, y: ev.clientY }),
		pressure: resolvePressure({
			pressure: ev.pressure,
			enabled: props.settings.pressureSensitivity,
			capable: g?.type === 'draw' ? g.pressureCapable : false,
		}),
	};
}

function distance(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function startPinch() {
	if (gesture.value?.type === 'draw') activeTool?.cancel();
	const [a, b] = [...pointers.values()];
	gesture.value = {
		type: 'pinch',
		startDistance: Math.max(1, distance(a, b)),
		startMid: toViewportCentered({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }),
		startView: { ...view.value },
	};
}

function onPointerDown(ev: PointerEvent) {
	// 主ボタン(描画/パン)と中ボタン(パン)のみ扱う。右クリックやペンのお尻側(消しゴムボタン)などは無視する
	if (ev.button !== 0 && ev.button !== 1) return;

	rootEl.value?.setPointerCapture(ev.pointerId);
	const client = { x: ev.clientX, y: ev.clientY };
	pointers.set(ev.pointerId, client);

	if (pointers.size === 2) {
		startPinch();
		return;
	}
	if (pointers.size > 2 || gesture.value != null) return;

	if (props.tool === 'hand' || ev.button === 1) {
		gesture.value = { type: 'pan', pointerId: ev.pointerId, last: client };
	} else if (activeTool != null) {
		gesture.value = { type: 'draw', pointerId: ev.pointerId, pressureCapable: isPressureCapable(ev.pointerType, ev.pressure) };
		activeTool.down(toStrokePoint(ev));
	}
}

function onPointerMove(ev: PointerEvent) {
	if (!pointers.has(ev.pointerId)) return;
	const client = { x: ev.clientX, y: ev.clientY };
	pointers.set(ev.pointerId, client);

	const g = gesture.value;
	if (g == null) return;

	switch (g.type) {
		case 'draw': {
			if (g.pointerId !== ev.pointerId) return;
			// 高頻度入力をまとめて受け取れる環境では取りこぼしなく線を引く
			const events = ev.getCoalescedEvents?.() ?? [];
			for (const e of events.length > 0 ? events : [ev]) {
				activeTool?.move(toStrokePoint(e));
			}
			break;
		}
		case 'pan': {
			if (g.pointerId !== ev.pointerId) return;
			view.value = {
				...view.value,
				panX: view.value.panX + client.x - g.last.x,
				panY: view.value.panY + client.y - g.last.y,
			};
			g.last = client;
			break;
		}
		case 'pinch': {
			const [a, b] = [...pointers.values()];
			const mid = toViewportCentered({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
			const zoomed = zoomAt(g.startView, g.startView.zoom * distance(a, b) / g.startDistance, g.startMid);
			view.value = {
				zoom: zoomed.zoom,
				panX: zoomed.panX + mid.x - g.startMid.x,
				panY: zoomed.panY + mid.y - g.startMid.y,
			};
			break;
		}
	}
}

function releasePointer(ev: PointerEvent, commit: boolean) {
	if (!pointers.has(ev.pointerId)) return;
	pointers.delete(ev.pointerId);

	const g = gesture.value;
	if (g == null) return;

	if (g.type === 'draw' && g.pointerId === ev.pointerId) {
		if (commit) {
			activeTool?.up(toStrokePoint(ev));
		} else {
			activeTool?.cancel();
		}
		gesture.value = null;
	} else if (g.type === 'pan' && g.pointerId === ev.pointerId) {
		gesture.value = null;
	} else if (g.type === 'pinch' && pointers.size < 2) {
		// ピンチ終了後に残った指で意図しない描画をしないよう、全指が離れるまで何もしない
		gesture.value = null;
	}
}

function onPointerUp(ev: PointerEvent) {
	releasePointer(ev, true);
}

function onPointerCancel(ev: PointerEvent) {
	releasePointer(ev, false);
}

function onWheel(ev: WheelEvent) {
	const factor = Math.exp(-ev.deltaY * (ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? 0.05 : 0.0015));
	view.value = zoomAt(view.value, view.value.zoom * factor, toViewportCentered({ x: ev.clientX, y: ev.clientY }));
}

function resetView() {
	const rect = rootEl.value?.getBoundingClientRect();
	view.value = {
		zoom: rect ? fitZoom(rect.width, rect.height, props.spec.width, props.spec.height, 72) : 1,
		panX: 0,
		panY: 0,
	};
}

/** 履歴のスナップショットをキャンバスに復元する */
function restore(imageData: ImageData) {
	activeTool?.cancel();
	gesture.value = null;
	ctx?.putImageData(imageData, 0, 0);
}

/** キャンバスを下地で塗り直し (透明ならすべて消して) その状態を返す */
function clearToBackground(): ImageData {
	activeTool?.cancel();
	gesture.value = null;
	clearCanvas(overlayCtx!);
	ctx!.clearRect(0, 0, props.spec.width, props.spec.height);
	if (props.spec.background != null) {
		ctx!.fillStyle = props.spec.background;
		ctx!.fillRect(0, 0, props.spec.width, props.spec.height);
	}
	return snapshot();
}

/** dataURL の画像を背景色の上に描き、その状態を返す */
function drawImageFromDataUrl(dataUrl: string): Promise<ImageData> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			clearToBackground();
			ctx!.drawImage(image, 0, 0);
			resolve(snapshot());
		};
		image.onerror = () => reject(new Error('Failed to load image'));
		image.src = dataUrl;
	});
}

/** 画像をキャンバス全面に引き伸ばして描き、その状態を返す */
function drawImage(image: CanvasImageSource, options: { smooth?: boolean; } = {}): ImageData {
	clearToBackground();
	ctx!.save();
	ctx!.imageSmoothingEnabled = options.smooth ?? true;
	ctx!.imageSmoothingQuality = 'high';
	ctx!.drawImage(image, 0, 0, props.spec.width, props.spec.height);
	ctx!.restore();
	return snapshot();
}

/** 画像を拡縮せず、指定位置に描き、その状態を返す */
function drawImageAt(image: CanvasImageSource, x: number, y: number): ImageData {
	clearToBackground();
	ctx!.drawImage(image, Math.round(x), Math.round(y));
	return snapshot();
}

/** 今のキャンバスの内容を別の canvas に写して返す (大きさを変える前の退避用) */
function cloneCanvas(): HTMLCanvasElement {
	const clone = window.document.createElement('canvas');
	clone.width = props.spec.width;
	clone.height = props.spec.height;
	clone.getContext('2d')!.drawImage(canvasEl.value!, 0, 0);
	return clone;
}

function toDataUrl(): string {
	return canvasEl.value!.toDataURL('image/png');
}

function toBlob(): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvasEl.value!.toBlob(blob => {
			if (blob == null) {
				reject(new Error('Failed to encode canvas'));
			} else {
				resolve(blob);
			}
		}, 'image/png');
	});
}

onMounted(() => {
	ctx = canvasEl.value!.getContext('2d', { willReadFrequently: true });
	// 線の二値化で毎フレーム読み出すため
	overlayCtx = overlayEl.value!.getContext('2d', { willReadFrequently: true });
	if (ctx == null || overlayCtx == null) return;

	clearToBackground();

	rebuildTool();
	resetView();
	emit('ready', snapshot());
});

defineExpose({
	restore,
	clearToBackground,
	drawImage,
	drawImageAt,
	cloneCanvas,
	drawImageFromDataUrl,
	toDataUrl,
	toBlob,
	resetView,
});
</script>

<style lang="scss" module>
.root {
	position: absolute;
	inset: 0;
	overflow: hidden;
	touch-action: none;
	user-select: none;
	cursor: crosshair;
	background: var(--MI_THEME-bg);

	&.hand {
		cursor: grab;
	}

	&.panning {
		cursor: grabbing;
	}
}

.stage {
	position: absolute;
	top: 50%;
	left: 50%;
	transform-origin: center;
	box-shadow: 0 2px 16px var(--MI_THEME-shadow);
	background: var(--MI_THEME-panel);

	// 透明なキャンバスは市松模様を下に敷いて、透けていることが分かるようにする
	&.checkered {
		background-image:
			linear-gradient(45deg, var(--MI_THEME-bg) 25%, transparent 25%, transparent 75%, var(--MI_THEME-bg) 75%),
			linear-gradient(45deg, var(--MI_THEME-bg) 25%, transparent 25%, transparent 75%, var(--MI_THEME-bg) 75%);
		background-size: 16px 16px;
		background-position: 0 0, 8px 8px;
	}
}

.canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;

	&.pixelated {
		image-rendering: pixelated;
	}
}

.overlay {
	pointer-events: none;
}
</style>

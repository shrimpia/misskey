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
	<div :class="$style.stage" :style="stageStyle">
		<canvas
			ref="canvasEl"
			:class="[$style.canvas, { [$style.pixelated]: view.zoom >= 1 }]"
			:width="DRAWING_CANVAS_WIDTH"
			:height="DRAWING_CANVAS_HEIGHT"
			role="img"
			:aria-label="i18n.ts._shDrawing.canvas"
		></canvas>
		<canvas
			ref="overlayEl"
			:class="[$style.canvas, $style.overlay, { [$style.pixelated]: view.zoom >= 1 }]"
			:width="DRAWING_CANVAS_WIDTH"
			:height="DRAWING_CANVAS_HEIGHT"
		></canvas>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import type { DrawingSettings, DrawingToolKind, Point } from '@/utility/drawing/types.js';
import type { DrawingTool } from '@/utility/drawing/tools.js';
import type { ViewportState } from '@/utility/drawing/viewport.js';
import { DRAWING_BACKGROUND_COLOR, DRAWING_CANVAS_HEIGHT, DRAWING_CANVAS_WIDTH } from '@/utility/drawing/types.js';
import { createDrawingTool } from '@/utility/drawing/tools.js';
import { clientToCanvas, fitZoom, zoomAt } from '@/utility/drawing/viewport.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	tool: DrawingToolKind;
	settings: DrawingSettings;
}>();

const emit = defineEmits<{
	(ev: 'ready', snapshot: ImageData): void;
	(ev: 'commit', snapshot: ImageData): void;
	(ev: 'pickColor', hex: string): void;
}>();

type Gesture =
	| { type: 'draw'; pointerId: number; }
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
	width: `${DRAWING_CANVAS_WIDTH}px`,
	height: `${DRAWING_CANVAS_HEIGHT}px`,
	transform: `translate(-50%, -50%) translate(${view.value.panX}px, ${view.value.panY}px) scale(${view.value.zoom})`,
}));

function snapshot(): ImageData {
	return ctx!.getImageData(0, 0, DRAWING_CANVAS_WIDTH, DRAWING_CANVAS_HEIGHT);
}

function rebuildTool() {
	activeTool?.cancel();
	if (ctx == null || overlayCtx == null) return;
	activeTool = createDrawingTool(props.tool, {
		ctx,
		overlayCtx,
		getSettings: () => props.settings,
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
	return clientToCanvas(client, canvasEl.value!.getBoundingClientRect(), DRAWING_CANVAS_WIDTH, DRAWING_CANVAS_HEIGHT);
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
		gesture.value = { type: 'draw', pointerId: ev.pointerId };
		activeTool.down(toCanvasPoint(client));
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
				activeTool?.move(toCanvasPoint({ x: e.clientX, y: e.clientY }));
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
			activeTool?.up(toCanvasPoint({ x: ev.clientX, y: ev.clientY }));
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
		zoom: rect ? fitZoom(rect.width, rect.height, DRAWING_CANVAS_WIDTH, DRAWING_CANVAS_HEIGHT, 72) : 1,
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
	overlayCtx = overlayEl.value!.getContext('2d');
	if (ctx == null || overlayCtx == null) return;

	ctx.fillStyle = DRAWING_BACKGROUND_COLOR;
	ctx.fillRect(0, 0, DRAWING_CANVAS_WIDTH, DRAWING_CANVAS_HEIGHT);

	rebuildTool();
	resetView();
	emit('ready', snapshot());
});

defineExpose({
	restore,
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

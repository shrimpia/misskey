<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div
	ref="rootEl"
	class="_noSelect"
	:class="[$style.root, { [$style.hand]: tool === 'hand', [$style.panning]: gesture?.type === 'pan', [$style.brush]: brushCursor != null }]"
	@pointerdown="onPointerDown"
	@pointermove="onPointerMove"
	@pointerup="onPointerUp"
	@pointercancel="onPointerCancel"
	@lostpointercapture="onPointerCancel"
	@pointerleave="cursor = null"
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
	<!-- ブラシの大きさを示す円。画像ではなく画面の上に重ねるだけ -->
	<div
		v-if="brushCursor != null"
		:class="[$style.brushCursor, { [$style.eraserCursor]: tool === 'eraser' }]"
		:style="brushCursor"
	></div>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import type { DrawingCanvasSpec, DrawingSettings, DrawingToolKind, Point, StrokePoint } from '@/utility/drawing/types.js';
import type { DrawingTool } from '@/utility/drawing/tools.js';
import type { DrawingPatch } from '@/utility/drawing/history.js';
import type { ViewportState } from '@/utility/drawing/viewport.js';
import { createDrawingTool } from '@/utility/drawing/tools.js';
import { BASE_LAYER_ID, DrawingLayerStack } from '@/utility/drawing/layers.js';
import { rgbaToHex } from '@/utility/drawing/color.js';
import { ROTATE_START_THRESHOLD, clientToCanvas, fitZoom, normalizeRotation, snapRotation, transformAt, zoomAt } from '@/utility/drawing/viewport.js';
import { isPressureCapable, resolvePressure, smoothPressure, widthForPressure } from '@/utility/drawing/pressure.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	tool: DrawingToolKind;
	settings: DrawingSettings;
	spec: DrawingCanvasSpec;
}>();

const emit = defineEmits<{
	(ev: 'ready'): void;
	(ev: 'commit', patch: DrawingPatch): void;
	(ev: 'pickColor', hex: string): void;
}>();

type Gesture =
	| { type: 'draw'; pointerId: number; pressureCapable: boolean; }
	| { type: 'pan'; pointerId: number; last: Point; }
	| { type: 'pinch'; startDistance: number; startAngle: number; startMid: Point; startView: ViewportState; rotating: boolean; };

const rootEl = useTemplateRef('rootEl');
const canvasEl = useTemplateRef('canvasEl');
const overlayEl = useTemplateRef('overlayEl');

const view = defineModel<ViewportState>('view', { required: true });
const gesture = shallowRef<Gesture | null>(null);
/** 押下中のポインタのクライアント座標 */
const pointers = new Map<number, Point>();

/** 表示用 (レイヤーを合成した結果) */
let ctx: CanvasRenderingContext2D | null = null;
let overlayCtx: CanvasRenderingContext2D | null = null;
let activeTool: DrawingTool | null = null;
let layers: DrawingLayerStack | null = null;

const stageStyle = computed(() => ({
	width: `${props.spec.width}px`,
	height: `${props.spec.height}px`,
	transform: `translate(-50%, -50%) translate(${view.value.panX}px, ${view.value.panY}px) rotate(${view.value.rotation}rad) scale(${view.value.zoom})`,
}));

function clearCanvas(target: CanvasRenderingContext2D) {
	target.clearRect(0, 0, target.canvas.width, target.canvas.height);
}

/**
 * 消しゴムの作業中か。
 * この間は現在のレイヤーの内容が作業レイヤー側に出ているので、表示からは外す
 */
let directEditing = false;

/** レイヤーを表示用キャンバスへまとめる */
function composite() {
	if (ctx == null || layers == null) return;
	layers.flattenTo(ctx, { skip: directEditing ? layers.active.id : null });
}

/** 現在のレイヤーを作業レイヤーへ写し、表示からは外す (消しゴムのプレビュー用) */
function beginDirectEdit() {
	if (layers == null || overlayCtx == null) return;
	clearCanvas(overlayCtx);
	overlayCtx.drawImage(layers.active.canvas, 0, 0);
	directEditing = true;
	composite();
}

function endDirectEdit() {
	directEditing = false;
	composite();
}

/** 合成後の色を拾う (スポイト用) */
function sampleColor(p: Point): string | null {
	if (ctx == null || layers == null || !layers.contains(p)) return null;
	const [r, g, b, a] = ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
	// 透明な部分には色が無いので拾わない (黒を拾ったように見えてしまう)
	if (a === 0) return null;
	return rgbaToHex({ r, g, b, a });
}

function rebuildTool() {
	activeTool?.cancel();
	if (overlayCtx == null || layers == null) return;
	const active = layers.active;
	activeTool = createDrawingTool(props.tool, {
		ctx: active.ctx,
		overlayCtx,
		getSettings: () => props.settings,
		sampleColor,
		beginDirectEdit,
		endDirectEdit,
		commit: (patch) => {
			// 焼き付け先のレイヤーを差分に記録しておく (undo/redo が対象を間違えないように)
			composite();
			emit('commit', { target: active.id, ...patch });
		},
		pickColor: hex => emit('pickColor', hex),
	});
}

/** 進行中の操作を捨てる。カーソルに出している筆圧も戻す */
function abortGesture() {
	activeTool?.cancel();
	gesture.value = null;
	strokePressure.value = null;
}

watch(() => props.tool, () => {
	abortGesture();
	rebuildTool();
});

/**
 * ポインタ座標の変換はすべてルート要素の矩形を基準にする。
 *
 * 回転が入るとキャンバス要素の外接矩形からは元の座標を求められないため。
 * 1 回のイベントで何度も変換するときは、読み出した矩形を渡して使い回す
 */
function viewportRect(): DOMRect {
	return rootEl.value!.getBoundingClientRect();
}

/** ビューポート中心を原点とした座標に変換する */
function toViewportCentered(client: Point, rect = viewportRect()): Point {
	return {
		x: client.x - (rect.left + rect.width / 2),
		y: client.y - (rect.top + rect.height / 2),
	};
}

function toCanvasPoint(client: Point, rect = viewportRect()): Point {
	return clientToCanvas(client, rect, view.value, props.spec.width, props.spec.height);
}

/**
 * ポインタの位置と筆圧を、描画ツールに渡す形にする。
 *
 * 筆圧を取れているかはストローク単位で覚える (draw ジェスチャの pressureCapable)。
 * ペンを離す瞬間は 0 が飛んでくるので、サンプル単位で判定してはいけない
 */
function toStrokePoint(ev: { clientX: number; clientY: number; pressure: number; pointerType: string; }, rect?: DOMRect): StrokePoint {
	const g = gesture.value;
	if (g?.type === 'draw' && !g.pressureCapable && isPressureCapable(ev.pointerType, ev.pressure)) {
		g.pressureCapable = true;
	}

	return {
		...toCanvasPoint({ x: ev.clientX, y: ev.clientY }, rect),
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

/** 2 点を結ぶ向き (rad) */
function pointerAngle(a: Point, b: Point): number {
	return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * ピンチの基準を今の 2 点で取り直す。
 *
 * 倍率と角度は基準からの差で求めるので、指の組が変わったときも呼ぶ
 */
function startPinch() {
	if (gesture.value?.type === 'draw') abortGesture();
	const [a, b] = [...pointers.values()];
	gesture.value = {
		type: 'pinch',
		startDistance: Math.max(1, distance(a, b)),
		startAngle: pointerAngle(a, b),
		startMid: toViewportCentered({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }),
		startView: { ...view.value },
		rotating: false,
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
		const p = toStrokePoint(ev);
		strokePressure.value = p.pressure;
		activeTool.down(p);
	}
}

function onPointerMove(ev: PointerEvent) {
	const rect = rootEl.value?.getBoundingClientRect();
	if (rect == null) return;
	cursor.value = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
	// キャンバスに戻ってきたら、中央のプレビューは待たずに切り上げる
	if (showingSizePreview.value) clearSizePreview();

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
				const p = toStrokePoint(e, rect);
				// StrokeTool と同じ平滑化を同じサンプル列に掛けて、カーソルを実際に置かれる太さに合わせる
				strokePressure.value = smoothPressure(strokePressure.value ?? p.pressure, p.pressure);
				activeTool?.move(p);
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
			const mid = toViewportCentered({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, rect);

			const angle = pointerAngle(a, b);
			// 遊びを抜けた時点を新しい基準にする (回転が始まる瞬間に角度が飛ばないように)
			if (!g.rotating && Math.abs(normalizeRotation(angle - g.startAngle)) > ROTATE_START_THRESHOLD) {
				g.rotating = true;
				g.startAngle = angle;
			}
			const rotation = g.rotating ? snapRotation(g.startView.rotation + normalizeRotation(angle - g.startAngle)) : g.startView.rotation;

			const moved = transformAt(g.startView, g.startView.zoom * distance(a, b) / g.startDistance, rotation - g.startView.rotation, g.startMid);
			view.value = {
				...moved,
				panX: moved.panX + mid.x - g.startMid.x,
				panY: moved.panY + mid.y - g.startMid.y,
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
		strokePressure.value = null;
	} else if (g.type === 'pan' && g.pointerId === ev.pointerId) {
		gesture.value = null;
	} else if (g.type === 'pinch') {
		if (pointers.size < 2) {
			// ピンチ終了後に残った指で意図しない描画をしないよう、全指が離れるまで何もしない
			gesture.value = null;
		} else {
			// 3 本目以降が絡んで指の組が変わったときは、基準を取り直して飛びを防ぐ
			startPinch();
		}
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

// #region ブラシカーソル
/** ルート要素を基準としたポインタ位置 (CSS px) */
const cursor = shallowRef<Point | null>(null);
/** 描いている間の筆圧 (平滑化後)。押していない間は null */
const strokePressure = shallowRef<number | null>(null);
/** 太さを変えた直後だけ、キャンバス中央に大きさを出す */
const showingSizePreview = ref(false);
let sizePreviewTimer: number | null = null;

const brushWidth = computed(() => props.tool === 'eraser' ? props.settings.eraserWidth : props.settings.penWidth);

const brushCursor = computed(() => {
	if (props.tool !== 'pen' && props.tool !== 'eraser') return null;

	const position = showingSizePreview.value ? canvasCenter() : cursor.value;
	if (position == null) return null;

	// 押している間は実際に置かれる太さを映す。ホバー中 (筆圧 0 が来る) は基準の太さのまま出す
	const width = strokePressure.value == null ? brushWidth.value : widthForPressure(brushWidth.value, strokePressure.value);
	// 細い線でも見えるように最低限の大きさは確保する
	const diameter = Math.max(4, width * view.value.zoom);
	return {
		width: `${diameter}px`,
		height: `${diameter}px`,
		transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
		...(props.tool === 'pen' ? { background: props.settings.penColor } : {}),
	};
});

/** ルート要素を基準としたキャンバス中央の位置 */
function canvasCenter(): Point | null {
	const rect = rootEl.value?.getBoundingClientRect();
	if (rect == null) return null;
	return {
		x: rect.width / 2 + view.value.panX,
		y: rect.height / 2 + view.value.panY,
	};
}

function clearSizePreview() {
	showingSizePreview.value = false;
	if (sizePreviewTimer != null) {
		window.clearTimeout(sizePreviewTimer);
		sizePreviewTimer = null;
	}
}

watch(brushWidth, () => {
	if (props.tool !== 'pen' && props.tool !== 'eraser') return;
	showingSizePreview.value = true;
	if (sizePreviewTimer != null) window.clearTimeout(sizePreviewTimer);
	sizePreviewTimer = window.setTimeout(clearSizePreview, 800);
});

onUnmounted(() => {
	if (sizePreviewTimer != null) window.clearTimeout(sizePreviewTimer);
});
// #endregion

function resetView() {
	const rect = rootEl.value?.getBoundingClientRect();
	view.value = {
		zoom: rect ? fitZoom(rect.width, rect.height, props.spec.width, props.spec.height, 72) : 1,
		panX: 0,
		panY: 0,
		rotation: 0,
	};
}

/** 履歴の差分を書き戻す。undo なら before、redo なら after */
function applyPatch(patch: DrawingPatch, which: 'before' | 'after') {
	abortGesture();
	const layer = layers?.get(patch.target);
	if (layer == null) return;
	layer.ctx.putImageData(which === 'before' ? patch.before : patch.after, patch.box.x, patch.box.y);
	composite();
}

/** 内容を消して下地だけの状態に戻す */
function clearToBackground(): void {
	abortGesture();
	clearCanvas(overlayCtx!);
	if (layers == null) return;
	// 大きさや下地の色が変わっていることがあるので、レイヤーごと作り直す
	layers.reset(props.spec);
	composite();
	// ツールは作り直す前のレイヤーを掴んでいるので、繋ぎ直す
	rebuildTool();
}

/** dataURL の画像を下地の上に描く */
function drawImageFromDataUrl(dataUrl: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			clearToBackground();
			layers!.active.ctx.drawImage(image, 0, 0);
			composite();
			resolve();
		};
		image.onerror = () => reject(new Error('Failed to load image'));
		image.src = dataUrl;
	});
}

/** 画像をキャンバス全面に引き伸ばして描く */
function drawImage(image: CanvasImageSource, options: { smooth?: boolean; } = {}): void {
	clearToBackground();
	const target = layers!.active.ctx;
	target.save();
	target.imageSmoothingEnabled = options.smooth ?? true;
	target.imageSmoothingQuality = 'high';
	target.drawImage(image, 0, 0, props.spec.width, props.spec.height);
	target.restore();
	composite();
}

/**
 * 大きさを変え、各レイヤーの内容を新しい大きさへ描き直す。
 * canvas は拡縮せず位置だけずらす (切り抜き / 余白)、image は引き伸ばす
 */
function resizeCanvas(mode: 'canvas' | 'image', offset: Point, options: { smooth?: boolean; } = {}): void {
	abortGesture();
	clearCanvas(overlayCtx!);
	layers?.resize(props.spec, (target, source) => {
		if (mode === 'canvas') {
			target.drawImage(source, Math.round(offset.x), Math.round(offset.y));
		} else {
			target.save();
			target.imageSmoothingEnabled = options.smooth ?? true;
			target.imageSmoothingQuality = 'high';
			target.drawImage(source, 0, 0, props.spec.width, props.spec.height);
			target.restore();
		}
	});
	composite();
	rebuildTool();
}

/**
 * PNG の dataURL を作る。
 *
 * `toDataURL` は同期で PNG を書き出すため、大きなキャンバスではその間 UI が止まる。
 * `toBlob` は非同期なのでそちらを使う
 */
async function toDataUrl(): Promise<string> {
	const blob = await toBlob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
		reader.readAsDataURL(blob);
	});
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
	// スポイトで合成後の色を読むため
	ctx = canvasEl.value!.getContext('2d', { willReadFrequently: true });
	// 線の二値化で毎フレーム読み出すため
	overlayCtx = overlayEl.value!.getContext('2d', { willReadFrequently: true });
	if (ctx == null || overlayCtx == null) return;

	layers = new DrawingLayerStack(props.spec);
	layers.setActive(BASE_LAYER_ID);
	composite();

	rebuildTool();
	resetView();
	emit('ready');
});

defineExpose({
	applyPatch,
	clearToBackground,
	drawImage,
	resizeCanvas,
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
	cursor: crosshair;
	background: var(--MI_THEME-bg);

	&.hand {
		cursor: grab;
	}

	// ブラシの円が出ている間は OS のカーソルを消す (円が位置を示すため)
	&.brush {
		cursor: none;
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

.brushCursor {
	position: absolute;
	top: 0;
	left: 0;
	border-radius: 999px;
	pointer-events: none;
	box-sizing: border-box;
	// 下地と同系色でも輪郭が分かるように縁を付ける
	box-shadow: 0 0 0 1px color(from var(--MI_THEME-fg) srgb r g b / 0.4);
}

.eraserCursor {
	background: none;
	// 縁だけで表す。二重の輪にならないよう内側の縁は消す
	box-shadow: none;
	border: solid 2px color(from var(--MI_THEME-fg) srgb r g b / 0.5);
}
</style>

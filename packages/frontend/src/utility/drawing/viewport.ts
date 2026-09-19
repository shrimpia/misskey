/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Point } from './types.js';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 8;

/** ピンチ回転を始めるまでの遊び。普通のピンチズームで絵が傾かないように */
export const ROTATE_START_THRESHOLD = 10 * Math.PI / 180;
/** この範囲まで戻したら回転なしへ吸着させる */
export const ROTATE_SNAP_THRESHOLD = 3 * Math.PI / 180;

/**
 * キャンバスの表示状態
 *
 * (panX, panY) はビューポート中心からのキャンバス中心のオフセット (CSS px)。
 * rotation は表示上の回転 (ラジアン) で、キャンバスの内容には影響しない
 */
export type ViewportState = {
	zoom: number;
	panX: number;
	panY: number;
	rotation: number;
};

export function clampZoom(zoom: number): number {
	return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** 角度を -π〜π に収める */
export function normalizeRotation(rotation: number): number {
	const wrapped = (rotation + Math.PI) % (Math.PI * 2);
	return (wrapped < 0 ? wrapped + Math.PI * 2 : wrapped) - Math.PI;
}

/** 回転なしの近くでは 0 に吸着させる (水平に戻しやすいように) */
export function snapRotation(rotation: number): number {
	const normalized = normalizeRotation(rotation);
	return Math.abs(normalized) < ROTATE_SNAP_THRESHOLD ? 0 : normalized;
}

/**
 * ビューポートに余白込みで収まる倍率を返す。拡大時はドットがにじまないよう整数倍に丸める
 */
export function fitZoom(viewportWidth: number, viewportHeight: number, canvasWidth: number, canvasHeight: number, margin = 32): number {
	const raw = Math.min((viewportWidth - margin * 2) / canvasWidth, (viewportHeight - margin * 2) / canvasHeight);
	if (!Number.isFinite(raw) || raw <= 0) return 1;
	return clampZoom(raw >= 1 ? Math.floor(raw) : raw);
}

/**
 * ビューポート中心を原点とした座標 anchor を固定したまま、倍率と回転を変えた状態を返す
 */
export function transformAt(state: ViewportState, nextZoom: number, deltaRotation: number, anchor: Point): ViewportState {
	const zoom = clampZoom(nextZoom);
	const ratio = zoom / state.zoom;
	const cos = Math.cos(deltaRotation);
	const sin = Math.sin(deltaRotation);
	// アンカーから見たキャンバス中心の位置を、同じだけ回して倍率を掛け直す
	const dx = state.panX - anchor.x;
	const dy = state.panY - anchor.y;
	return {
		zoom,
		rotation: normalizeRotation(state.rotation + deltaRotation),
		panX: anchor.x + (dx * cos - dy * sin) * ratio,
		panY: anchor.y + (dx * sin + dy * cos) * ratio,
	};
}

/**
 * ビューポート中心を原点とした座標 anchor を固定したまま zoom を変更した状態を返す
 */
export function zoomAt(state: ViewportState, nextZoom: number, anchor: Point): ViewportState {
	return transformAt(state, nextZoom, 0, anchor);
}

/**
 * クライアント座標をキャンバス内部座標へ変換する。
 *
 * 回転が入ると要素の外接矩形からは求められないので、
 * ビューポートの矩形と表示状態から変換を解析的に戻す
 */
export function clientToCanvas(client: Point, viewportRect: { left: number; top: number; width: number; height: number; }, view: ViewportState, canvasWidth: number, canvasHeight: number): Point {
	const x = client.x - (viewportRect.left + viewportRect.width / 2) - view.panX;
	const y = client.y - (viewportRect.top + viewportRect.height / 2) - view.panY;
	const cos = Math.cos(-view.rotation);
	const sin = Math.sin(-view.rotation);
	return {
		x: (x * cos - y * sin) / view.zoom + canvasWidth / 2,
		y: (x * sin + y * cos) / view.zoom + canvasHeight / 2,
	};
}

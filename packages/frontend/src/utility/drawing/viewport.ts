/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Point } from './types.js';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 8;

/**
 * キャンバスの表示状態
 *
 * (panX, panY) はビューポート中心からのキャンバス中心のオフセット (CSS px)
 */
export type ViewportState = {
	zoom: number;
	panX: number;
	panY: number;
};

export function clampZoom(zoom: number): number {
	return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
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
 * ビューポート中心を原点とした座標 anchor を固定したまま zoom を変更した状態を返す
 */
export function zoomAt(state: ViewportState, nextZoom: number, anchor: Point): ViewportState {
	const zoom = clampZoom(nextZoom);
	const ratio = zoom / state.zoom;
	return {
		zoom,
		panX: anchor.x - (anchor.x - state.panX) * ratio,
		panY: anchor.y - (anchor.y - state.panY) * ratio,
	};
}

/**
 * クライアント座標を、表示中のキャンバス要素の矩形を基準にキャンバス内部座標へ変換する
 */
export function clientToCanvas(client: Point, rect: { left: number; top: number; width: number; height: number; }, canvasWidth: number, canvasHeight: number): Point {
	return {
		x: (client.x - rect.left) / rect.width * canvasWidth,
		y: (client.y - rect.top) / rect.height * canvasHeight,
	};
}

/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { PixelBuffer } from './flood-fill.js';

/** これ以上不透明なら残す、未満なら捨てる境目 */
export const ALPHA_THRESHOLD = 128;

/**
 * 半透明のピクセルを不透明か透明かに振り分けて、アンチエイリアスの縁を落とす。
 *
 * Canvas 2D はパス描画のアンチエイリアスを切れないため、透明なレイヤーに描いた線をこれで
 * 二値化してから重ねることで、輪郭がぼけない線になる。縁がぼけないと塗りつぶしが境界で素直に止まる。
 *
 * buffer を直接書き換える。
 */
export function hardenAlpha(buffer: PixelBuffer, threshold = ALPHA_THRESHOLD): void {
	const { data } = buffer;
	for (let i = 3; i < data.length; i += 4) {
		data[i] = data[i] >= threshold ? 255 : 0;
	}
}

export type Box = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/**
 * 2 点を結ぶ線が太さ込みで収まる整数の矩形を、キャンバス内に収めて返す
 */
export function strokeBox(
	from: { x: number; y: number },
	to: { x: number; y: number },
	lineWidth: number,
	canvasWidth: number,
	canvasHeight: number,
): Box {
	// 端の丸みとアンチエイリアスのはみ出しを含めるため少し広げる
	const margin = lineWidth / 2 + 2;
	const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - margin));
	const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - margin));
	const right = Math.min(canvasWidth, Math.ceil(Math.max(from.x, to.x) + margin));
	const bottom = Math.min(canvasHeight, Math.ceil(Math.max(from.y, to.y) + margin));
	return {
		x: left,
		y: top,
		width: Math.max(0, right - left),
		height: Math.max(0, bottom - top),
	};
}

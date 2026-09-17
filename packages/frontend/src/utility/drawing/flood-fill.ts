/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Rgba } from './types.js';

/** ImageData と互換のある最小限の構造 (テスト容易性のため) */
export type PixelBuffer = {
	readonly width: number;
	readonly height: number;
	readonly data: Uint8ClampedArray;
};

function isSimilar(data: Uint8ClampedArray, offset: number, target: Rgba, tolerance: number): boolean {
	return Math.abs(data[offset] - target.r) <= tolerance
		&& Math.abs(data[offset + 1] - target.g) <= tolerance
		&& Math.abs(data[offset + 2] - target.b) <= tolerance
		&& Math.abs(data[offset + 3] - target.a) <= tolerance;
}

/**
 * (x, y) と連結する類似色の領域を color で塗りつぶす (スキャンライン方式)
 *
 * buffer を直接書き換える。塗りつぶしが発生した場合 true を返す
 */
export function floodFill(buffer: PixelBuffer, x: number, y: number, color: Rgba, tolerance = 0): boolean {
	const { width, height, data } = buffer;
	x = Math.floor(x);
	y = Math.floor(y);
	if (x < 0 || y < 0 || x >= width || y >= height) return false;

	const startOffset = (y * width + x) * 4;
	const target: Rgba = {
		r: data[startOffset],
		g: data[startOffset + 1],
		b: data[startOffset + 2],
		a: data[startOffset + 3],
	};

	// 塗る色が対象と同色なら何もしない (無限ループ防止)
	if (target.r === color.r && target.g === color.g && target.b === color.b && target.a === color.a) return false;

	const visited = new Uint8Array(width * height);
	const stack: [number, number][] = [[x, y]];
	let filled = false;

	const matches = (px: number, py: number) => {
		const i = py * width + px;
		return visited[i] === 0 && isSimilar(data, i * 4, target, tolerance);
	};

	while (stack.length > 0) {
		const [sx, sy] = stack.pop()!;
		if (!matches(sx, sy)) continue;

		let left = sx;
		while (left > 0 && matches(left - 1, sy)) left--;
		let right = sx;
		while (right < width - 1 && matches(right + 1, sy)) right++;

		let upAdded = false;
		let downAdded = false;
		for (let px = left; px <= right; px++) {
			const i = sy * width + px;
			visited[i] = 1;
			const o = i * 4;
			data[o] = color.r;
			data[o + 1] = color.g;
			data[o + 2] = color.b;
			data[o + 3] = color.a;
			filled = true;

			if (sy > 0) {
				if (matches(px, sy - 1)) {
					if (!upAdded) {
						stack.push([px, sy - 1]);
						upAdded = true;
					}
				} else {
					upAdded = false;
				}
			}
			if (sy < height - 1) {
				if (matches(px, sy + 1)) {
					if (!downAdded) {
						stack.push([px, sy + 1]);
						downAdded = true;
					}
				} else {
					downAdded = false;
				}
			}
		}
	}

	return filled;
}

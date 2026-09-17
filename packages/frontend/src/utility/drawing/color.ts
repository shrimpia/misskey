/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Rgba } from './types.js';

/**
 * `#rgb` / `#rrggbb` 形式の文字列を RGBA に変換する。不正な形式なら null
 */
export function hexToRgba(hex: string): Rgba | null {
	const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	if (m == null) return null;
	let h = m[1];
	if (h.length === 3) h = h.split('').map(c => c + c).join('');
	const n = parseInt(h, 16);
	return {
		r: (n >> 16) & 0xff,
		g: (n >> 8) & 0xff,
		b: n & 0xff,
		a: 255,
	};
}

/**
 * RGB を `#rrggbb` 形式の文字列に変換する (アルファは無視)
 */
export function rgbaToHex(rgba: Rgba): string {
	return '#' + [rgba.r, rgba.g, rgba.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

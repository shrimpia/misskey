/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Point } from './types.js';

export const ANCHOR_POINTS = [
	'topLeft', 'top', 'topRight',
	'left', 'center', 'right',
	'bottomLeft', 'bottom', 'bottomRight',
] as const;

export type AnchorPoint = typeof ANCHOR_POINTS[number];

type Size = {
	width: number;
	height: number;
};

function ratioOf(anchor: AnchorPoint): { x: number; y: number; } {
	const x = anchor.endsWith('Left') || anchor === 'left' ? 0
		: anchor.endsWith('Right') || anchor === 'right' ? 1
		: 0.5;
	const y = anchor.startsWith('top') ? 0
		: anchor.startsWith('bottom') ? 1
		: 0.5;
	return { x, y };
}

/**
 * キャンバスの大きさを変えたとき、元の内容を描く位置を返す。
 *
 * 拡縮はしないので、広がった側は余白になり、狭まった側ははみ出して切り取られる (負の値になる)
 */
export function offsetForAnchor(anchor: AnchorPoint, from: Size, to: Size): Point {
	const ratio = ratioOf(anchor);
	return {
		// `|| 0` は -0 を 0 に寄せるため
		x: Math.round((to.width - from.width) * ratio.x) || 0,
		y: Math.round((to.height - from.height) * ratio.y) || 0,
	};
}

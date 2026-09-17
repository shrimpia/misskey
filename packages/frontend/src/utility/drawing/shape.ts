/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Point, ShapeFillMode, ShapeKind } from './types.js';

export type ShapeStyle = {
	kind: ShapeKind;
	mode: ShapeFillMode;
	width: number;
	strokeColor: string;
	fillColor: string;
};

/**
 * from から to までのドラッグ範囲に図形を描画する
 *
 * 直線は面を持たないため mode に関わらず線のみ描画する
 */
export function drawShape(ctx: CanvasRenderingContext2D, from: Point, to: Point, style: ShapeStyle): void {
	ctx.save();
	ctx.lineWidth = style.width;
	ctx.strokeStyle = style.strokeColor;
	ctx.fillStyle = style.fillColor;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	ctx.beginPath();
	switch (style.kind) {
		case 'rect': {
			ctx.rect(Math.min(from.x, to.x), Math.min(from.y, to.y), Math.abs(to.x - from.x), Math.abs(to.y - from.y));
			break;
		}
		case 'ellipse': {
			const rx = Math.abs(to.x - from.x) / 2;
			const ry = Math.abs(to.y - from.y) / 2;
			ctx.ellipse((from.x + to.x) / 2, (from.y + to.y) / 2, rx, ry, 0, 0, Math.PI * 2);
			break;
		}
		case 'line': {
			ctx.moveTo(from.x, from.y);
			ctx.lineTo(to.x, to.y);
			ctx.stroke();
			ctx.restore();
			return;
		}
	}

	if (style.mode === 'fill' || style.mode === 'strokeAndFill') ctx.fill();
	if (style.mode === 'stroke' || style.mode === 'strokeAndFill') ctx.stroke();
	ctx.restore();
}

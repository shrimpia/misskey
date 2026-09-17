/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { hexToRgba, rgbaToHex } from './color.js';
import { floodFill } from './flood-fill.js';
import { drawShape } from './shape.js';
import { DRAWING_BACKGROUND_COLOR } from './types.js';
import type { DrawingSettings, DrawingToolKind, Point } from './types.js';

/** 塗りつぶし時にアンチエイリアスの縁も同じ領域とみなすための許容差 */
const FILL_TOLERANCE = 48;

export type DrawingToolContext = {
	/** 確定描画先 */
	ctx: CanvasRenderingContext2D;
	/** 図形のプレビューなど、確定前の描画先 */
	overlayCtx: CanvasRenderingContext2D;
	/** 呼び出し時点の最新設定を返す */
	getSettings: () => DrawingSettings;
	/** 確定描画が行われたときに呼ぶ (履歴への記録など) */
	commit: () => void;
	/** スポイトで色が取得されたときに呼ぶ */
	pickColor: (hex: string) => void;
};

export interface DrawingTool {
	down(p: Point): void;
	move(p: Point): void;
	up(p: Point): void;
	/** 操作の中断 (マルチタッチへの切り替えなど)。確定前の状態を破棄する */
	cancel(): void;
}

function clearCanvas(ctx: CanvasRenderingContext2D) {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

class StrokeTool implements DrawingTool {
	private last: Point | null = null;
	private snapshot: ImageData | null = null;

	constructor(
		private readonly c: DrawingToolContext,
		private readonly getStyle: (settings: DrawingSettings) => { color: string; width: number; },
	) {}

	public down(p: Point) {
		const { ctx } = this.c;
		const { color, width } = this.getStyle(this.c.getSettings());
		this.snapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
		this.last = p;
		ctx.save();
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(p.x, p.y, width / 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	public move(p: Point) {
		if (this.last == null) return;
		const { ctx } = this.c;
		const { color, width } = this.getStyle(this.c.getSettings());
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.moveTo(this.last.x, this.last.y);
		ctx.lineTo(p.x, p.y);
		ctx.stroke();
		ctx.restore();
		this.last = p;
	}

	public up(p: Point) {
		if (this.last == null) return;
		this.move(p);
		this.last = null;
		this.snapshot = null;
		this.c.commit();
	}

	public cancel() {
		if (this.snapshot != null) this.c.ctx.putImageData(this.snapshot, 0, 0);
		this.last = null;
		this.snapshot = null;
	}
}

class FillTool implements DrawingTool {
	constructor(private readonly c: DrawingToolContext) {}

	public down(p: Point) {
		const { ctx } = this.c;
		const color = hexToRgba(this.c.getSettings().penColor);
		if (color == null) return;
		const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
		if (floodFill(imageData, p.x, p.y, color, FILL_TOLERANCE)) {
			ctx.putImageData(imageData, 0, 0);
			this.c.commit();
		}
	}

	public move() { /* noop */ }
	public up() { /* noop */ }
	public cancel() { /* noop */ }
}

class ShapeTool implements DrawingTool {
	private from: Point | null = null;

	constructor(private readonly c: DrawingToolContext) {}

	private styleOf(settings: DrawingSettings) {
		return {
			kind: settings.shapeKind,
			mode: settings.shapeMode,
			width: settings.shapeWidth,
			strokeColor: settings.shapeStrokeColor,
			fillColor: settings.shapeFillColor,
		};
	}

	public down(p: Point) {
		this.from = p;
	}

	public move(p: Point) {
		if (this.from == null) return;
		clearCanvas(this.c.overlayCtx);
		drawShape(this.c.overlayCtx, this.from, p, this.styleOf(this.c.getSettings()));
	}

	public up(p: Point) {
		if (this.from == null) return;
		clearCanvas(this.c.overlayCtx);
		const from = this.from;
		this.from = null;
		if (from.x === p.x && from.y === p.y) return;
		drawShape(this.c.ctx, from, p, this.styleOf(this.c.getSettings()));
		this.c.commit();
	}

	public cancel() {
		clearCanvas(this.c.overlayCtx);
		this.from = null;
	}
}

class EyedropperTool implements DrawingTool {
	constructor(private readonly c: DrawingToolContext) {}

	public down() { /* noop */ }
	public move() { /* noop */ }

	public up(p: Point) {
		const { ctx } = this.c;
		const x = Math.floor(p.x);
		const y = Math.floor(p.y);
		if (x < 0 || y < 0 || x >= ctx.canvas.width || y >= ctx.canvas.height) return;
		const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
		this.c.pickColor(rgbaToHex({ r, g, b, a }));
	}

	public cancel() { /* noop */ }
}

/**
 * ツール種別に対応する描画ツールを生成する。手ツールはキャンバスを描き換えないため null
 */
export function createDrawingTool(kind: DrawingToolKind, context: DrawingToolContext): DrawingTool | null {
	switch (kind) {
		case 'hand': return null;
		case 'pen': return new StrokeTool(context, s => ({ color: s.penColor, width: s.penWidth }));
		case 'eraser': return new StrokeTool(context, s => ({ color: DRAWING_BACKGROUND_COLOR, width: s.eraserWidth }));
		case 'fill': return new FillTool(context);
		case 'shape': return new ShapeTool(context);
		case 'eyedropper': return new EyedropperTool(context);
	}
}

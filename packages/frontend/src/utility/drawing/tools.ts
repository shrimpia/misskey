/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { hexToRgba, rgbaToHex } from './color.js';
import { floodFill } from './flood-fill.js';
import { hardenAlpha, strokeBox } from './harden.js';
import { drawShape } from './shape.js';
import type { DrawingSettings, DrawingToolKind, Point } from './types.js';
import type { Box } from './harden.js';

/**
 * 塗りつぶしの許容差。
 * 線は二値化して重ねるので縁がぼけない。わずかな誤差だけ拾えれば足りる
 */
const FILL_TOLERANCE = 8;

export type DrawingToolContext = {
	/** 確定描画先 */
	ctx: CanvasRenderingContext2D;
	/** 図形のプレビューなど、確定前の描画先 */
	overlayCtx: CanvasRenderingContext2D;
	/** 呼び出し時点の最新設定を返す */
	getSettings: () => DrawingSettings;
	/** キャンバスの下地の色。null なら透明 */
	getBackground: () => string | null;
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

/** 指定範囲のアンチエイリアスの縁を落とす */
function hardenRegion(ctx: CanvasRenderingContext2D, box: Box) {
	if (box.width <= 0 || box.height <= 0) return;
	const imageData = ctx.getImageData(box.x, box.y, box.width, box.height);
	hardenAlpha(imageData);
	ctx.putImageData(imageData, box.x, box.y);
}

/**
 * 作業レイヤーの内容を確定レイヤーへ焼き付ける。
 * 作業レイヤーは二値化済みなので、重ねた結果も縁がぼけない
 */
function commitOverlay(c: DrawingToolContext, composite: GlobalCompositeOperation = 'source-over') {
	c.ctx.save();
	c.ctx.globalCompositeOperation = composite;
	c.ctx.drawImage(c.overlayCtx.canvas, 0, 0);
	c.ctx.restore();
	clearCanvas(c.overlayCtx);
	c.commit();
}

/**
 * ペン / 消しゴム。
 *
 * 描いている間は作業レイヤーに描いて都度二値化し、離した時点で確定レイヤーへ焼き付ける。
 * 確定レイヤーは背景色で埋まっていて α が常に 255 なので、そちらへ直接描くと二値化できない
 */
class StrokeTool implements DrawingTool {
	private last: Point | null = null;

	constructor(
		private readonly c: DrawingToolContext,
		private readonly getStyle: (settings: DrawingSettings) => { color: string; width: number; },
		/** 焼き付け方。消しゴムは下地が透明なら destination-out で削り取る */
		private readonly getComposite: () => GlobalCompositeOperation = () => 'source-over',
	) {}

	public down(p: Point) {
		const { overlayCtx } = this.c;
		const { color, width } = this.getStyle(this.c.getSettings());
		this.last = p;
		overlayCtx.save();
		overlayCtx.fillStyle = color;
		overlayCtx.beginPath();
		overlayCtx.arc(p.x, p.y, width / 2, 0, Math.PI * 2);
		overlayCtx.fill();
		overlayCtx.restore();
		hardenRegion(overlayCtx, strokeBox(p, p, width, overlayCtx.canvas.width, overlayCtx.canvas.height));
	}

	public move(p: Point) {
		if (this.last == null) return;
		const { overlayCtx } = this.c;
		const { color, width } = this.getStyle(this.c.getSettings());
		const from = this.last;
		overlayCtx.save();
		overlayCtx.strokeStyle = color;
		overlayCtx.lineWidth = width;
		overlayCtx.lineCap = 'round';
		overlayCtx.lineJoin = 'round';
		overlayCtx.beginPath();
		overlayCtx.moveTo(from.x, from.y);
		overlayCtx.lineTo(p.x, p.y);
		overlayCtx.stroke();
		overlayCtx.restore();
		hardenRegion(overlayCtx, strokeBox(from, p, width, overlayCtx.canvas.width, overlayCtx.canvas.height));
		this.last = p;
	}

	public up(p: Point) {
		if (this.last == null) return;
		this.move(p);
		this.last = null;
		commitOverlay(this.c, this.getComposite());
	}

	public cancel() {
		clearCanvas(this.c.overlayCtx);
		this.last = null;
	}
}

class FillTool implements DrawingTool {
	constructor(private readonly c: DrawingToolContext) {}

	// ピンチ操作の開始で意図せず塗られないよう、押下時ではなく離した時点で塗る
	public down() { /* noop */ }
	public move() { /* noop */ }

	public up(p: Point) {
		const { ctx } = this.c;
		const color = hexToRgba(this.c.getSettings().penColor);
		if (color == null) return;
		const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
		if (floodFill(imageData, p.x, p.y, color, FILL_TOLERANCE)) {
			ctx.putImageData(imageData, 0, 0);
			this.c.commit();
		}
	}

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
		const from = this.from;
		this.from = null;
		clearCanvas(this.c.overlayCtx);
		if (from.x === p.x && from.y === p.y) return;
		// 確定形をもう一度作業レイヤーに描いてから二値化して焼き付ける
		drawShape(this.c.overlayCtx, from, p, this.styleOf(this.c.getSettings()));
		const { overlayCtx } = this.c;
		hardenRegion(overlayCtx, { x: 0, y: 0, width: overlayCtx.canvas.width, height: overlayCtx.canvas.height });
		commitOverlay(this.c);
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
		// 透明な部分には色が無いので拾わない (黒を拾ったように見えてしまう)
		if (a === 0) return;
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
		case 'eraser': return new StrokeTool(
			context,
			s => ({ color: context.getBackground() ?? '#000000', width: s.eraserWidth }),
			() => context.getBackground() == null ? 'destination-out' : 'source-over',
		);
		case 'fill': return new FillTool(context);
		case 'shape': return new ShapeTool(context);
		case 'eyedropper': return new EyedropperTool(context);
	}
}

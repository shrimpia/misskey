/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { hexToRgba, rgbaToHex } from './color.js';
import { floodFill } from './flood-fill.js';
import { hardenAlpha, strokeBox, unionBox } from './harden.js';
import { drawShape } from './shape.js';
import { smoothPressure, stampCount, widthForPressure } from './pressure.js';
import type { DrawingSettings, DrawingToolKind, Point, StrokePoint } from './types.js';
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
	down(p: StrokePoint): void;
	move(p: StrokePoint): void;
	up(p: StrokePoint): void;
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
	private last: StrokePoint | null = null;
	/** まだ二値化していない範囲 */
	private pendingBox: Box | null = null;
	private hardenFrame: number | null = null;

	constructor(
		private readonly c: DrawingToolContext,
		private readonly getStyle: (settings: DrawingSettings) => { color: string; width: number; },
		/** 焼き付け方。消しゴムは下地が透明なら destination-out で削り取る */
		private readonly getComposite: () => GlobalCompositeOperation = () => 'source-over',
	) {}

	/**
	 * 二値化はフレームに 1 回にまとめる。
	 *
	 * getImageData / putImageData は呼ぶだけで高くつく。Apple Pencil のように 1 フレームへ
	 * 十数個のサンプルが届く環境では、サンプルごとに呼ぶと目に見えて詰まる
	 */
	private queueHarden(box: Box) {
		this.pendingBox = unionBox(this.pendingBox, box);
		if (this.hardenFrame != null) return;
		this.hardenFrame = window.requestAnimationFrame(() => {
			this.hardenFrame = null;
			this.flushHarden();
		});
	}

	private flushHarden() {
		if (this.hardenFrame != null) {
			window.cancelAnimationFrame(this.hardenFrame);
			this.hardenFrame = null;
		}
		if (this.pendingBox == null) return;
		hardenRegion(this.c.overlayCtx, this.pendingBox);
		this.pendingBox = null;
	}

	public down(p: StrokePoint) {
		const { overlayCtx } = this.c;
		const { color, width } = this.getStyle(this.c.getSettings());
		// ストロークの最初のサンプルが平滑化の起点になる
		this.last = p;
		const radius = widthForPressure(width, p.pressure) / 2;

		overlayCtx.save();
		overlayCtx.fillStyle = color;
		overlayCtx.beginPath();
		overlayCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
		overlayCtx.fill();
		overlayCtx.restore();
		this.queueHarden(strokeBox(p, p, radius * 2, overlayCtx.canvas.width, overlayCtx.canvas.height));
	}

	public move(p: StrokePoint) {
		if (this.last == null) return;
		const { overlayCtx } = this.c;
		const { color, width } = this.getStyle(this.c.getSettings());
		const from = this.last;
		// 生の筆圧は細かく揺れるので、均してから太さに使う
		const to: StrokePoint = { x: p.x, y: p.y, pressure: smoothPressure(from.pressure, p.pressure) };

		const fromWidth = widthForPressure(width, from.pressure);
		const toWidth = widthForPressure(width, to.pressure);

		overlayCtx.save();
		overlayCtx.fillStyle = color;
		overlayCtx.strokeStyle = color;

		if (fromWidth === toWidth) {
			// 太さが変わらないなら 1 本の線で引くほうが速い (筆圧オフのときは常にこちら)
			overlayCtx.lineWidth = fromWidth;
			overlayCtx.lineCap = 'round';
			overlayCtx.lineJoin = 'round';
			overlayCtx.beginPath();
			overlayCtx.moveTo(from.x, from.y);
			overlayCtx.lineTo(to.x, to.y);
			overlayCtx.stroke();
		} else {
			// 線分の中でも太さを変えるため、円を並べて埋める
			const distance = Math.hypot(to.x - from.x, to.y - from.y);
			const steps = stampCount(distance, Math.max(fromWidth, toWidth) / 2);
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				overlayCtx.beginPath();
				overlayCtx.arc(
					from.x + (to.x - from.x) * t,
					from.y + (to.y - from.y) * t,
					(fromWidth + (toWidth - fromWidth) * t) / 2,
					0,
					Math.PI * 2,
				);
				overlayCtx.fill();
			}
		}

		overlayCtx.restore();
		this.queueHarden(strokeBox(from, to, Math.max(fromWidth, toWidth), overlayCtx.canvas.width, overlayCtx.canvas.height));
		this.last = to;
	}

	public up(p: StrokePoint) {
		if (this.last == null) return;
		// 離す瞬間の筆圧は当てにならないので、最後に取れていた値のまま閉じる
		this.move({ x: p.x, y: p.y, pressure: this.last.pressure });
		this.last = null;
		// 焼き付ける前に、残っている範囲を二値化しきる
		this.flushHarden();
		commitOverlay(this.c, this.getComposite());
	}

	public cancel() {
		if (this.hardenFrame != null) {
			window.cancelAnimationFrame(this.hardenFrame);
			this.hardenFrame = null;
		}
		this.pendingBox = null;
		clearCanvas(this.c.overlayCtx);
		this.last = null;
	}
}

class FillTool implements DrawingTool {
	constructor(private readonly c: DrawingToolContext) {}

	// ピンチ操作の開始で意図せず塗られないよう、押下時ではなく離した時点で塗る
	public down() { /* noop */ }
	public move() { /* noop */ }

	public up(p: StrokePoint) {
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
	private from: StrokePoint | null = null;

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

	public down(p: StrokePoint) {
		this.from = p;
	}

	public move(p: StrokePoint) {
		if (this.from == null) return;
		clearCanvas(this.c.overlayCtx);
		drawShape(this.c.overlayCtx, this.from, p, this.styleOf(this.c.getSettings()));
	}

	public up(p: StrokePoint) {
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

	public up(p: StrokePoint) {
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

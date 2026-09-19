/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DrawingCanvasSpec, Point } from './types.js';

/** 下地のレイヤー。ユーザーが直接描くことはない */
export const BACKGROUND_LAYER_ID = 'background';
/** 既定の描画レイヤー。履歴の差分の target もこれ */
export const BASE_LAYER_ID = 'base';

export type DrawingLayer = {
	id: string;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	visible: boolean;
	/** 0〜1 */
	opacity: number;
	/** 下地のように、ツールで描き換えられないレイヤー */
	locked: boolean;
};

function createLayer(id: string, spec: DrawingCanvasSpec, options: { locked?: boolean; } = {}): DrawingLayer {
	const canvas = window.document.createElement('canvas');
	canvas.width = spec.width;
	canvas.height = spec.height;
	// 塗りつぶし・スポイト・線の二値化で読み出すため
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (ctx == null) throw new Error('Failed to get 2d context');
	return {
		id,
		canvas,
		ctx,
		visible: true,
		opacity: 1,
		locked: options.locked ?? false,
	};
}

/**
 * レイヤーの積み重ね。配列の先頭が一番下。
 *
 * UI はまだ無いが、下地を 1 枚のレイヤーとして持つことで、消しゴムが「下地の色で塗る」ではなく
 * 「削って下を見せる」になり、後からレイヤーを増やすときに描画側を作り直さずに済む。
 *
 * 各レイヤーは画面に出さない canvas を持ち、表示用の canvas へまとめて転送する
 */
export class DrawingLayerStack {
	private layers: DrawingLayer[];
	private activeId: string;

	constructor(private spec: DrawingCanvasSpec) {
		this.layers = [
			createLayer(BACKGROUND_LAYER_ID, spec, { locked: true }),
			createLayer(BASE_LAYER_ID, spec),
		];
		this.activeId = BASE_LAYER_ID;
		this.paintBackground();
	}

	/** 下から上の順 */
	public get all(): readonly DrawingLayer[] {
		return this.layers;
	}

	public get active(): DrawingLayer {
		return this.get(this.activeId) ?? this.layers[this.layers.length - 1];
	}

	public setActive(id: string): void {
		if (this.get(id) != null) this.activeId = id;
	}

	public get(id: string): DrawingLayer | null {
		return this.layers.find(layer => layer.id === id) ?? null;
	}

	/** 下地を spec の色で塗り直す (透明ならすべて消す) */
	public paintBackground(): void {
		const layer = this.get(BACKGROUND_LAYER_ID);
		if (layer == null) return;
		layer.ctx.clearRect(0, 0, this.spec.width, this.spec.height);
		if (this.spec.background != null) {
			layer.ctx.fillStyle = this.spec.background;
			layer.ctx.fillRect(0, 0, this.spec.width, this.spec.height);
		}
	}

	/**
	 * 大きさも内容も作り直す。
	 * spec の大きさが変わったときにこれを呼ばないと、古い大きさの canvas へ描き続けてしまう
	 */
	public reset(spec: DrawingCanvasSpec): void {
		this.spec = spec;
		this.layers = this.layers.map(layer => {
			const next = createLayer(layer.id, spec, { locked: layer.locked });
			next.visible = layer.visible;
			next.opacity = layer.opacity;
			return next;
		});
		this.paintBackground();
	}

	/**
	 * 大きさを変える。下地は塗り直し、それ以外は draw で描き直してもらう
	 * (切り抜き / 余白なら位置をずらして、リサイズなら引き伸ばして描く)
	 */
	public resize(spec: DrawingCanvasSpec, draw: (ctx: CanvasRenderingContext2D, source: HTMLCanvasElement) => void): void {
		this.spec = spec;
		this.layers = this.layers.map(layer => {
			const next = createLayer(layer.id, spec, { locked: layer.locked });
			next.visible = layer.visible;
			next.opacity = layer.opacity;
			if (layer.id !== BACKGROUND_LAYER_ID) draw(next.ctx, layer.canvas);
			return next;
		});
		this.paintBackground();
	}

	/** 表示用 / 書き出し用に 1 枚へまとめる */
	public flattenTo(ctx: CanvasRenderingContext2D): void {
		ctx.clearRect(0, 0, this.spec.width, this.spec.height);
		for (const layer of this.layers) {
			if (!layer.visible || layer.opacity <= 0) continue;
			ctx.save();
			ctx.globalAlpha = layer.opacity;
			ctx.drawImage(layer.canvas, 0, 0);
			ctx.restore();
		}
	}

	/** 指定位置がキャンバスの中か */
	public contains(p: Point): boolean {
		return p.x >= 0 && p.y >= 0 && p.x < this.spec.width && p.y < this.spec.height;
	}
}

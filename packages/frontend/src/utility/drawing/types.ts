/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const DRAWING_TOOL_KINDS = ['hand', 'pen', 'eraser', 'fill', 'shape', 'eyedropper'] as const;
export type DrawingToolKind = typeof DRAWING_TOOL_KINDS[number];

export const SHAPE_KINDS = ['rect', 'ellipse', 'line'] as const;
export type ShapeKind = typeof SHAPE_KINDS[number];

export const SHAPE_FILL_MODES = ['stroke', 'fill', 'strokeAndFill'] as const;
export type ShapeFillMode = typeof SHAPE_FILL_MODES[number];

export type Point = {
	x: number;
	y: number;
};

/** 描画に使う点。pressure は太さに掛ける 0〜1 の値 (筆圧が使えない場合は 1) */
export type StrokePoint = Point & {
	pressure: number;
};

export type Rgba = {
	r: number;
	g: number;
	b: number;
	a: number;
};

export type DrawingSettings = {
	penWidth: number;
	/** #rrggbb */
	penColor: string;
	eraserWidth: number;
	shapeKind: ShapeKind;
	shapeMode: ShapeFillMode;
	shapeWidth: number;
	/** #rrggbb */
	shapeStrokeColor: string;
	/** #rrggbb */
	shapeFillColor: string;
	/** ペン / 消しゴムで筆圧を使うか */
	pressureSensitivity: boolean;
};

/** キャンバスの大きさと下地。背景が null なら透明 */
export type DrawingCanvasSpec = {
	width: number;
	height: number;
	/** `#rrggbb`。null は透明 */
	background: string | null;
};

export const MIN_CANVAS_SIZE = 8;
export const MAX_CANVAS_SIZE = 2048;

export type CanvasSizePresetKey = 'square' | 'landscape' | 'portrait' | 'emoji';

export const CANVAS_SIZE_PRESETS: { key: CanvasSizePresetKey; width: number; height: number; }[] = [
	{ key: 'square', width: 500, height: 500 },
	{ key: 'landscape', width: 1600, height: 900 },
	{ key: 'portrait', width: 900, height: 1600 },
	{ key: 'emoji', width: 300, height: 300 },
];

export const DEFAULT_CANVAS_SPEC: DrawingCanvasSpec = {
	width: 300,
	height: 300,
	background: '#ffffff',
};

export function clampCanvasSize(value: number): number {
	if (!Number.isFinite(value)) return MIN_CANVAS_SIZE;
	return Math.min(MAX_CANVAS_SIZE, Math.max(MIN_CANVAS_SIZE, Math.round(value)));
}

/**
 * 保存されていた値をキャンバス仕様として読み直す。壊れていれば既定値に戻す
 */
export function parseCanvasSpec(value: unknown): DrawingCanvasSpec {
	if (typeof value !== 'object' || value == null) return { ...DEFAULT_CANVAS_SPEC };
	const { width, height, background } = value as Partial<DrawingCanvasSpec>;
	if (typeof width !== 'number' || typeof height !== 'number') return { ...DEFAULT_CANVAS_SPEC };
	return {
		width: clampCanvasSize(width),
		height: clampCanvasSize(height),
		background: typeof background === 'string' ? background : null,
	};
}

/**
 * 画像を読み込むときのキャンバス仕様を決める。
 * 上限を超える画像は縦横比を保ったまま縮める
 */
export function specForImage(imageWidth: number, imageHeight: number, background: string | null): DrawingCanvasSpec {
	const width = Math.max(1, Math.round(imageWidth));
	const height = Math.max(1, Math.round(imageHeight));
	const scale = Math.min(1, MAX_CANVAS_SIZE / Math.max(width, height));
	return {
		width: clampCanvasSize(width * scale),
		height: clampCanvasSize(height * scale),
		background,
	};
}

export function createDefaultDrawingSettings(): DrawingSettings {
	return {
		penWidth: 4,
		penColor: '#000000',
		eraserWidth: 16,
		shapeKind: 'rect',
		shapeMode: 'stroke',
		shapeWidth: 4,
		shapeStrokeColor: '#000000',
		shapeFillColor: '#ffffff',
		pressureSensitivity: false,
	};
}

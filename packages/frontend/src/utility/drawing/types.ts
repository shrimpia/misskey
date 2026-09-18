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
 * 履歴 1 件は幅 × 高さ × 4 バイト。大きなキャンバスで持ちすぎないよう件数を絞る
 */
export function historyLimitFor(spec: { width: number; height: number; }): number {
	const BUDGET_BYTES = 64 * 1024 * 1024;
	const perSnapshot = Math.max(1, spec.width * spec.height * 4);
	return Math.min(30, Math.max(5, Math.floor(BUDGET_BYTES / perSnapshot)));
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
	};
}

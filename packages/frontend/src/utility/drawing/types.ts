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

export const DRAWING_CANVAS_WIDTH = 300;
export const DRAWING_CANVAS_HEIGHT = 300;
export const DRAWING_BACKGROUND_COLOR = '#ffffff';

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

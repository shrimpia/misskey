/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import { floodFill } from '@/utility/drawing/flood-fill.js';
import type { PixelBuffer } from '@/utility/drawing/flood-fill.js';
import type { Rgba } from '@/utility/drawing/types.js';

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
const RED: Rgba = { r: 255, g: 0, b: 0, a: 255 };

function createBuffer(width: number, height: number, color: Rgba): PixelBuffer {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		data.set([color.r, color.g, color.b, color.a], i * 4);
	}
	return { width, height, data };
}

function setPixel(buf: PixelBuffer, x: number, y: number, color: Rgba) {
	buf.data.set([color.r, color.g, color.b, color.a], (y * buf.width + x) * 4);
}

function getPixel(buf: PixelBuffer, x: number, y: number): Rgba {
	const o = (y * buf.width + x) * 4;
	return { r: buf.data[o], g: buf.data[o + 1], b: buf.data[o + 2], a: buf.data[o + 3] };
}

describe('floodFill', () => {
	test('一色の領域全体を塗りつぶす', () => {
		const buf = createBuffer(4, 4, WHITE);
		assert.isNotNull(floodFill(buf, 1, 1, RED));
		for (let y = 0; y < 4; y++) {
			for (let x = 0; x < 4; x++) {
				assert.deepEqual(getPixel(buf, x, y), RED);
			}
		}
	});

	test('境界線の外側は塗らない', () => {
		// 5x5 の中央に 3x3 の黒枠
		const buf = createBuffer(5, 5, WHITE);
		for (let i = 1; i <= 3; i++) {
			setPixel(buf, i, 1, BLACK);
			setPixel(buf, i, 3, BLACK);
			setPixel(buf, 1, i, BLACK);
			setPixel(buf, 3, i, BLACK);
		}
		floodFill(buf, 2, 2, RED);
		assert.deepEqual(getPixel(buf, 2, 2), RED);
		assert.deepEqual(getPixel(buf, 0, 0), WHITE);
		assert.deepEqual(getPixel(buf, 1, 1), BLACK);
	});

	test('凹形状も漏れなく塗る', () => {
		// U 字の壁の内側から塗る
		const buf = createBuffer(5, 4, WHITE);
		for (let y = 0; y < 3; y++) setPixel(buf, 2, y, BLACK);
		floodFill(buf, 0, 0, RED);
		assert.deepEqual(getPixel(buf, 4, 0), RED);
		assert.deepEqual(getPixel(buf, 2, 3), RED);
		assert.deepEqual(getPixel(buf, 2, 0), BLACK);
	});

	test('同色で塗ろうとした場合は何もしない', () => {
		const buf = createBuffer(3, 3, RED);
		assert.isNull(floodFill(buf, 1, 1, RED));
	});

	test('範囲外の座標は何もしない', () => {
		const buf = createBuffer(3, 3, WHITE);
		assert.isNull(floodFill(buf, -1, 0, RED));
		assert.isNull(floodFill(buf, 3, 0, RED));
	});

	test('許容差内の近似色も塗る', () => {
		const buf = createBuffer(3, 1, WHITE);
		setPixel(buf, 1, 0, { r: 240, g: 240, b: 240, a: 255 });
		floodFill(buf, 0, 0, RED, 0);
		assert.deepEqual(getPixel(buf, 2, 0), WHITE);

		const buf2 = createBuffer(3, 1, WHITE);
		setPixel(buf2, 1, 0, { r: 240, g: 240, b: 240, a: 255 });
		floodFill(buf2, 0, 0, RED, 20);
		assert.deepEqual(getPixel(buf2, 2, 0), RED);
	});
});

describe('floodFill が返す範囲', () => {
	test('塗った領域の外接矩形を返す', () => {
		// 5x5 の白地の中央 3x3 だけを塗れる状態にする (周囲は黒で囲む)
		const buf = createBuffer(5, 5, BLACK);
		for (let y = 1; y <= 3; y++) {
			for (let x = 1; x <= 3; x++) setPixel(buf, x, y, WHITE);
		}
		const box = floodFill(buf, 2, 2, RED);
		assert.deepEqual(box, { x: 1, y: 1, width: 3, height: 3 });
	});

	test('全面を塗ればキャンバス全体になる', () => {
		const buf = createBuffer(4, 3, WHITE);
		assert.deepEqual(floodFill(buf, 0, 0, RED), { x: 0, y: 0, width: 4, height: 3 });
	});

	test('1px だけ塗れる場合は 1x1', () => {
		const buf = createBuffer(3, 1, BLACK);
		setPixel(buf, 1, 0, WHITE);
		assert.deepEqual(floodFill(buf, 1, 0, RED), { x: 1, y: 0, width: 1, height: 1 });
	});
});

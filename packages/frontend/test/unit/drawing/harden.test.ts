/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import { ALPHA_THRESHOLD, hardenAlpha, strokeBox } from '@/utility/drawing/harden.js';
import { floodFill } from '@/utility/drawing/flood-fill.js';
import type { PixelBuffer } from '@/utility/drawing/flood-fill.js';

function bufferOf(alphas: number[]): PixelBuffer {
	const data = new Uint8ClampedArray(alphas.length * 4);
	alphas.forEach((a, i) => data.set([0, 0, 0, a], i * 4));
	return { width: alphas.length, height: 1, data };
}

function alphasOf(buf: PixelBuffer): number[] {
	return Array.from({ length: buf.width * buf.height }, (_, i) => buf.data[i * 4 + 3]);
}

describe('hardenAlpha', () => {
	test('境目以上は不透明、未満は透明になる', () => {
		const buf = bufferOf([0, 1, ALPHA_THRESHOLD - 1, ALPHA_THRESHOLD, 200, 255]);
		hardenAlpha(buf);
		assert.deepEqual(alphasOf(buf), [0, 0, 0, 255, 255, 255]);
	});

	test('二値化済みの内容は変わらない (何度かけても同じ)', () => {
		const buf = bufferOf([0, 255, 0, 255]);
		hardenAlpha(buf);
		hardenAlpha(buf);
		assert.deepEqual(alphasOf(buf), [0, 255, 0, 255]);
	});

	test('境目は指定できる', () => {
		const buf = bufferOf([100, 200]);
		hardenAlpha(buf, 201);
		assert.deepEqual(alphasOf(buf), [0, 0]);
	});
});

describe('strokeBox', () => {
	test('太さと丸みの分だけ広げる', () => {
		const box = strokeBox({ x: 50, y: 50 }, { x: 60, y: 40 }, 10, 300, 300);
		assert.deepEqual(box, { x: 43, y: 33, width: 24, height: 24 });
	});

	test('キャンバスの外へはみ出さない', () => {
		const box = strokeBox({ x: 0, y: 0 }, { x: 2, y: 2 }, 20, 300, 300);
		assert.deepEqual(box, { x: 0, y: 0, width: 14, height: 14 });

		const far = strokeBox({ x: 299, y: 299 }, { x: 299, y: 299 }, 20, 300, 300);
		assert.equal(far.x + far.width, 300);
		assert.equal(far.y + far.height, 300);
	});
});

describe('二値化した線は塗りつぶしを止める', () => {
	test('アンチエイリアスの縁がないので許容差 0 でも漏れない', () => {
		// 白地の中央に、半透明の縁を持つ黒い縦線を引いた状態を作る
		const width = 5;
		const height = 1;
		const data = new Uint8ClampedArray(width * height * 4);
		for (let x = 0; x < width; x++) {
			const alpha = x === 2 ? 255 : x === 1 || x === 3 ? 120 : 0;
			data.set([0, 0, 0, alpha], x * 4);
		}
		const line: PixelBuffer = { width, height, data };
		hardenAlpha(line);

		// 二値化後の線を白地に重ねる (α 255 のみ黒として残る)
		const canvasData = new Uint8ClampedArray(width * height * 4);
		for (let x = 0; x < width; x++) {
			const isInk = line.data[x * 4 + 3] === 255;
			canvasData.set(isInk ? [0, 0, 0, 255] : [255, 255, 255, 255], x * 4);
		}
		const canvas: PixelBuffer = { width, height, data: canvasData };

		floodFill(canvas, 0, 0, { r: 255, g: 0, b: 0, a: 255 }, 0);
		const pixelAt = (x: number) => Array.from(canvasData.slice(x * 4, x * 4 + 4));
		assert.deepEqual(pixelAt(0), [255, 0, 0, 255], '左側は塗られる');
		assert.deepEqual(pixelAt(2), [0, 0, 0, 255], '線は残る');
		assert.deepEqual(pixelAt(4), [255, 255, 255, 255], '線の向こう側は塗られない');
	});
});

/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import { MAX_ZOOM, MIN_ZOOM, clampZoom, clientToCanvas, fitZoom, zoomAt } from '@/utility/drawing/viewport.js';
import { hexToRgba, rgbaToHex } from '@/utility/drawing/color.js';

describe('viewport', () => {
	test('ズームは上下限でクランプされる', () => {
		assert.equal(clampZoom(100), MAX_ZOOM);
		assert.equal(clampZoom(0), MIN_ZOOM);
		assert.equal(clampZoom(2), 2);
	});

	test('fitZoom は拡大時に整数倍へ丸める', () => {
		assert.equal(fitZoom(1000, 800, 300, 300, 32), 2);
		assert.approximately(fitZoom(300, 300, 300, 300, 0), 1, 1e-9);
		assert.approximately(fitZoom(200, 400, 300, 300, 0), 200 / 300, 1e-9);
	});

	test('zoomAt はアンカー位置を固定する', () => {
		const anchor = { x: 50, y: -20 };
		const before = { zoom: 1, panX: 10, panY: 10 };
		const after = zoomAt(before, 2, anchor);
		// アンカーから見たキャンバス中心の相対位置が倍率に比例する
		assert.approximately((anchor.x - after.panX) / (anchor.x - before.panX), 2, 1e-9);
		assert.approximately((anchor.y - after.panY) / (anchor.y - before.panY), 2, 1e-9);
	});

	test('clientToCanvas は表示サイズからキャンバス座標へ変換する', () => {
		const p = clientToCanvas({ x: 400, y: 250 }, { left: 100, top: 100, width: 600, height: 600 }, 300, 300);
		assert.deepEqual(p, { x: 150, y: 75 });
	});
});

describe('color', () => {
	test('hex と RGBA を相互変換できる', () => {
		assert.deepEqual(hexToRgba('#ff8000'), { r: 255, g: 128, b: 0, a: 255 });
		assert.deepEqual(hexToRgba('#f80'), { r: 255, g: 136, b: 0, a: 255 });
		assert.isNull(hexToRgba('red'));
		assert.equal(rgbaToHex({ r: 255, g: 128, b: 0, a: 255 }), '#ff8000');
	});
});

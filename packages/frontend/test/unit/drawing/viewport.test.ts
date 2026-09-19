/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import type { ViewportState } from '@/utility/drawing/viewport.js';
import { MAX_ZOOM, MIN_ZOOM, ROTATE_SNAP_THRESHOLD, clampZoom, clientToCanvas, fitZoom, normalizeRotation, snapRotation, transformAt, zoomAt } from '@/utility/drawing/viewport.js';
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
		const before = { zoom: 1, panX: 10, panY: 10, rotation: 0 };
		const after = zoomAt(before, 2, anchor);
		// アンカーから見たキャンバス中心の相対位置が倍率に比例する
		assert.approximately((anchor.x - after.panX) / (anchor.x - before.panX), 2, 1e-9);
		assert.approximately((anchor.y - after.panY) / (anchor.y - before.panY), 2, 1e-9);
		assert.equal(after.rotation, 0);
	});

	test('normalizeRotation は -π〜π に収める', () => {
		assert.approximately(normalizeRotation(Math.PI * 2.5), Math.PI / 2, 1e-9);
		assert.approximately(normalizeRotation(-Math.PI * 1.5), Math.PI / 2, 1e-9);
		assert.approximately(normalizeRotation(0.5), 0.5, 1e-9);
	});

	test('snapRotation は回転なしの近くで 0 へ吸着する', () => {
		assert.equal(snapRotation(ROTATE_SNAP_THRESHOLD / 2), 0);
		assert.equal(snapRotation(Math.PI * 2), 0);
		assert.approximately(snapRotation(ROTATE_SNAP_THRESHOLD * 2), ROTATE_SNAP_THRESHOLD * 2, 1e-9);
	});

	test('clientToCanvas は表示状態を逆に辿ってキャンバス座標へ変換する', () => {
		const rect = { left: 100, top: 100, width: 600, height: 600 };
		const view: ViewportState = { zoom: 2, panX: 0, panY: 0, rotation: 0 };
		assert.deepEqual(clientToCanvas({ x: 400, y: 250 }, rect, view, 300, 300), { x: 150, y: 75 });
	});

	test('clientToCanvas は回転を戻す', () => {
		const rect = { left: 0, top: 0, width: 300, height: 300 };
		// 画面を時計回りに 90 度回すと、画面の右方向はキャンバスの上方向になる
		const view: ViewportState = { zoom: 1, panX: 0, panY: 0, rotation: Math.PI / 2 };
		const p = clientToCanvas({ x: 160, y: 150 }, rect, view, 300, 300);
		assert.approximately(p.x, 150, 1e-9);
		assert.approximately(p.y, 140, 1e-9);
	});

	test('transformAt は回転と拡縮をまたいでもアンカー下のキャンバス座標を保つ', () => {
		// 中心が原点に来る矩形にして、クライアント座標とビューポート中心基準の座標を揃える
		const rect = { left: -150, top: -150, width: 300, height: 300 };
		const anchor = { x: 40, y: 25 };
		const before: ViewportState = { zoom: 1.5, panX: 20, panY: -10, rotation: 0.2 };
		const after = transformAt(before, 3, 0.7, anchor);

		assert.approximately(after.rotation, 0.9, 1e-9);
		const from = clientToCanvas(anchor, rect, before, 300, 300);
		const to = clientToCanvas(anchor, rect, after, 300, 300);
		assert.approximately(to.x, from.x, 1e-9);
		assert.approximately(to.y, from.y, 1e-9);
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

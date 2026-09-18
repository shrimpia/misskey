/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import { ANCHOR_POINTS, offsetForAnchor } from '@/utility/drawing/resize.js';

const FROM = { width: 100, height: 100 };

describe('offsetForAnchor', () => {
	test('広げるとき、基準位置の側に元の内容が寄る', () => {
		const to = { width: 200, height: 200 };
		assert.deepEqual(offsetForAnchor('topLeft', FROM, to), { x: 0, y: 0 });
		assert.deepEqual(offsetForAnchor('center', FROM, to), { x: 50, y: 50 });
		assert.deepEqual(offsetForAnchor('bottomRight', FROM, to), { x: 100, y: 100 });
		assert.deepEqual(offsetForAnchor('top', FROM, to), { x: 50, y: 0 });
		assert.deepEqual(offsetForAnchor('left', FROM, to), { x: 0, y: 50 });
	});

	test('狭めるとき、切り取られる側が負の値になる', () => {
		const to = { width: 60, height: 60 };
		assert.deepEqual(offsetForAnchor('topLeft', FROM, to), { x: 0, y: 0 });
		assert.deepEqual(offsetForAnchor('center', FROM, to), { x: -20, y: -20 });
		assert.deepEqual(offsetForAnchor('bottomRight', FROM, to), { x: -40, y: -40 });
	});

	test('大きさが変わらなければ動かない', () => {
		for (const anchor of ANCHOR_POINTS) {
			assert.deepEqual(offsetForAnchor(anchor, FROM, FROM), { x: 0, y: 0 }, anchor);
		}
	});

	test('奇数の差でも整数になる', () => {
		const offset = offsetForAnchor('center', { width: 100, height: 100 }, { width: 101, height: 101 });
		assert.deepEqual(offset, { x: 1, y: 1 });
		assert.isTrue(Number.isInteger(offset.x) && Number.isInteger(offset.y));
	});
});

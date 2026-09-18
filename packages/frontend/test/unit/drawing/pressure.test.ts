/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import { PRESSURE_MIN_RATIO, isPressureCapable, resolvePressure, smoothPressure, stampCount, widthForPressure } from '@/utility/drawing/pressure.js';

describe('isPressureCapable', () => {
	test('ペンで筆圧が乗っていれば true', () => {
		assert.isTrue(isPressureCapable('pen', 0.3));
	});

	test('マウスと指は false (マウスは 0.5 固定のため)', () => {
		assert.isFalse(isPressureCapable('mouse', 0.5));
		assert.isFalse(isPressureCapable('touch', 0.7));
	});

	test('筆圧 0 や異常値は false', () => {
		assert.isFalse(isPressureCapable('pen', 0));
		assert.isFalse(isPressureCapable('pen', Number.NaN));
	});
});

describe('resolvePressure', () => {
	test('筆圧が取れているストロークでは値をそのまま使う', () => {
		assert.equal(resolvePressure({ pressure: 0.3, enabled: true, capable: true }), 0.3);
		assert.equal(resolvePressure({ pressure: 1, enabled: true, capable: true }), 1);
	});

	test('ペンを離す瞬間の 0 で太くならない', () => {
		// ストローク単位で capable なら、0 は「弱い筆圧」であって「非対応」ではない
		assert.equal(resolvePressure({ pressure: 0, enabled: true, capable: true }), 0);
	});

	test('設定がオフなら 1', () => {
		assert.equal(resolvePressure({ pressure: 0.3, enabled: false, capable: true }), 1);
	});

	test('筆圧を取れないストロークは 1 (マウスや非対応環境)', () => {
		assert.equal(resolvePressure({ pressure: 0.5, enabled: true, capable: false }), 1);
		assert.equal(resolvePressure({ pressure: 0, enabled: true, capable: false }), 1);
	});

	test('範囲外の値は 0〜1 に丸める', () => {
		assert.equal(resolvePressure({ pressure: 1.5, enabled: true, capable: true }), 1);
		assert.equal(resolvePressure({ pressure: -1, enabled: true, capable: true }), 0);
		assert.equal(resolvePressure({ pressure: Number.NaN, enabled: true, capable: true }), 1);
	});
});

describe('widthForPressure', () => {
	test('筆圧 1 なら設定どおりの太さ', () => {
		assert.equal(widthForPressure(20, 1), 20);
	});

	test('筆圧 0 でも最小割合は残る', () => {
		assert.equal(widthForPressure(20, 0), 20 * PRESSURE_MIN_RATIO);
	});

	test('細い線でも 1px は残る', () => {
		assert.equal(widthForPressure(2, 0), 1);
	});

	test('筆圧が上がるほど太くなる', () => {
		const widths = [0, 0.25, 0.5, 0.75, 1].map(p => widthForPressure(20, p));
		for (let i = 1; i < widths.length; i++) {
			assert.isAbove(widths[i], widths[i - 1]);
		}
	});
});

describe('smoothPressure', () => {
	test('係数 1 なら即座に追従する', () => {
		assert.approximately(smoothPressure(0.2, 0.9, 1), 0.9, 1e-9);
	});

	test('係数 0 なら動かない', () => {
		assert.equal(smoothPressure(0.2, 0.9, 0), 0.2);
	});

	test('繰り返すと目標値へ単調に近づき、行き過ぎない', () => {
		let value = 0;
		let previous = -1;
		for (let i = 0; i < 50; i++) {
			value = smoothPressure(value, 1);
			assert.isAbove(value, previous);
			assert.isAtMost(value, 1);
			previous = value;
		}
		assert.approximately(value, 1, 0.01);
	});
});

describe('stampCount', () => {
	test('太い線ほど置く数が少なくて済む', () => {
		assert.isBelow(stampCount(100, 20), stampCount(100, 2));
	});

	test('動いていなくても 1 個は置く', () => {
		assert.equal(stampCount(0, 10), 1);
	});
});

/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import { DrawingHistory } from '@/utility/drawing/history.js';
import type { DrawingPatch } from '@/utility/drawing/history.js';
import { specForImage } from '@/utility/drawing/types.js';

/**
 * 差分 1 件。`bytes` で前後それぞれのバイト数を指定する
 * (履歴はバイト数しか見ないので、ImageData の中身は要らない)
 */
function patch(label: string, bytes = 4): DrawingPatch {
	const fake = (n: number) => ({ data: new Uint8ClampedArray(n) }) as unknown as ImageData;
	return {
		target: label,
		box: { x: 0, y: 0, width: 1, height: 1 },
		before: fake(bytes),
		after: fake(bytes),
	};
}

describe('DrawingHistory', () => {
	test('初期状態では undo/redo できず、未変更扱い', () => {
		const h = new DrawingHistory();
		assert.isFalse(h.canUndo);
		assert.isFalse(h.canRedo);
		assert.isFalse(h.isDirty);
		assert.isNull(h.undo());
		assert.isNull(h.redo());
	});

	test('push した差分を undo / redo で行き来できる', () => {
		const h = new DrawingHistory();
		const a = patch('a');
		h.push(a);
		assert.isTrue(h.isDirty);
		assert.isTrue(h.canUndo);
		assert.isFalse(h.canRedo);

		assert.equal(h.undo(), a);
		assert.isFalse(h.isDirty);
		assert.isTrue(h.canRedo);

		assert.equal(h.redo(), a);
		assert.isTrue(h.isDirty);
	});

	test('複数の差分を逆順に戻せる', () => {
		const h = new DrawingHistory();
		const [a, b, c] = [patch('a'), patch('b'), patch('c')];
		h.push(a);
		h.push(b);
		h.push(c);
		assert.equal(h.undo(), c);
		assert.equal(h.undo(), b);
		assert.equal(h.undo(), a);
		assert.isFalse(h.canUndo);
		assert.equal(h.redo(), a);
	});

	test('undo 後に push すると、やり直しの先は捨てられる', () => {
		const h = new DrawingHistory();
		h.push(patch('a'));
		h.push(patch('b'));
		h.undo();
		const c = patch('c');
		h.push(c);
		assert.isFalse(h.canRedo);
		assert.equal(h.undo(), c);
	});

	test('容量を超えると古い差分から捨てられる', () => {
		// 1 件 = 前後 100 バイトずつ = 200 バイト。250 バイトなら 1 件しか入らない
		const h = new DrawingHistory(250);
		h.push(patch('a', 100));
		h.push(patch('b', 100));
		assert.isTrue(h.canUndo);
		assert.equal(h.undo()?.target, 'b');
		// a は捨てられているのでこれ以上戻せない
		assert.isFalse(h.canUndo);
	});

	test('捨てられても最新の 1 件は残る', () => {
		const h = new DrawingHistory(1);
		h.push(patch('a', 1000));
		h.push(patch('b', 1000));
		assert.equal(h.undo()?.target, 'b');
	});

	test('触った範囲が小さいほど多く持てる', () => {
		const small = new DrawingHistory(10_000);
		for (let i = 0; i < 20; i++) small.push(patch(`s${i}`, 100));
		let count = 0;
		while (small.undo() != null) count++;
		assert.equal(count, 20, '小さい差分なら 20 件すべて残る');

		const large = new DrawingHistory(10_000);
		for (let i = 0; i < 20; i++) large.push(patch(`l${i}`, 3000));
		let largeCount = 0;
		while (large.undo() != null) largeCount++;
		assert.isBelow(largeCount, 5, '大きい差分は少ししか残らない');
	});

	test('markSaved 後は未変更扱い', () => {
		const h = new DrawingHistory();
		h.push(patch('a'));
		h.markSaved();
		assert.isFalse(h.isDirty);
		h.undo();
		assert.isTrue(h.isDirty);
	});

	test('clear で履歴が消え、未変更扱いになる', () => {
		const h = new DrawingHistory();
		h.push(patch('a'));
		h.clear();
		assert.isFalse(h.canUndo);
		assert.isFalse(h.canRedo);
		assert.isFalse(h.isDirty);
		assert.equal(h.usedBytes, 0);
	});
});

describe('specForImage', () => {
	test('上限内の画像はそのままの大きさ', () => {
		assert.deepEqual(specForImage(1200, 800, '#ffffff'), { width: 1200, height: 800, background: '#ffffff' });
	});

	test('上限を超える画像は縦横比を保って縮む', () => {
		const spec = specForImage(4096, 2048, null);
		assert.equal(spec.width, 2048);
		assert.equal(spec.height, 1024);
		assert.isNull(spec.background);
	});

	test('極端に小さい画像も最小サイズまでは確保する', () => {
		const spec = specForImage(1, 1, '#ffffff');
		assert.equal(spec.width, 8);
		assert.equal(spec.height, 8);
	});
});

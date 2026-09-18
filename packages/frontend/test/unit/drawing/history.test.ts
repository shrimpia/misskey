/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import { DrawingHistory } from '@/utility/drawing/history.js';
import { specForImage } from '@/utility/drawing/types.js';

describe('DrawingHistory', () => {
	test('初期状態では undo/redo できず、未変更扱い', () => {
		const h = new DrawingHistory<string>();
		h.reset('a');
		assert.isFalse(h.canUndo);
		assert.isFalse(h.canRedo);
		assert.isFalse(h.isDirty);
	});

	test('push → undo → redo', () => {
		const h = new DrawingHistory<string>();
		h.reset('a');
		h.push('b');
		assert.isTrue(h.isDirty);
		assert.equal(h.undo(), 'a');
		assert.isFalse(h.isDirty);
		assert.equal(h.redo(), 'b');
		assert.isTrue(h.isDirty);
	});

	test('undo 後の push で redo 履歴は破棄される', () => {
		const h = new DrawingHistory<string>();
		h.reset('a');
		h.push('b');
		h.undo();
		h.push('c');
		assert.isFalse(h.canRedo);
		assert.equal(h.undo(), 'a');
	});

	test('上限を超えた古い履歴は捨てられる', () => {
		const h = new DrawingHistory<number>(3);
		h.reset(0);
		h.push(1);
		h.push(2);
		h.push(3);
		assert.equal(h.undo(), 2);
		assert.equal(h.undo(), 1);
		assert.isFalse(h.canUndo);
		// 初期状態が履歴から消えても変更扱いのまま
		assert.isTrue(h.isDirty);
	});

	test('markSaved 後は未変更扱い', () => {
		const h = new DrawingHistory<string>();
		h.reset('a');
		h.push('b');
		h.markSaved();
		assert.isFalse(h.isDirty);
		h.undo();
		assert.isTrue(h.isDirty);
	});
});

describe('DrawingHistory#setLimit', () => {
	test('件数を減らすと古いものから捨てられ、現在位置も追従する', () => {
		const h = new DrawingHistory<number>(10);
		h.reset(0);
		for (const v of [1, 2, 3, 4]) h.push(v);
		h.setLimit(2);
		assert.equal(h.current, 4);
		assert.equal(h.undo(), 3);
		assert.isFalse(h.canUndo);
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

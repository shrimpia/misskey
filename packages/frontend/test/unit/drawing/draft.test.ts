/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { assert, describe, test } from 'vitest';
import { reactive, ref } from 'vue';
import { parseDrawingDraft, toPlainDraft } from '@/utility/drawing/draft.js';
import { DEFAULT_CANVAS_SPEC, createDefaultDrawingSettings } from '@/utility/drawing/types.js';

const VALID_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

describe('parseDrawingDraft', () => {
	test('正しい下書きはそのまま読める', () => {
		const settings = { ...createDefaultDrawingSettings(), penWidth: 12, penColor: '#ff0000' };
		const draft = parseDrawingDraft({ dataUrl: VALID_DATA_URL, settings, updatedAt: 1758000000000 });
		assert.isNotNull(draft);
		assert.equal(draft!.dataUrl, VALID_DATA_URL);
		assert.equal(draft!.settings.penWidth, 12);
		assert.equal(draft!.updatedAt, 1758000000000);
	});

	test('設定の欠けは既定値で埋める', () => {
		const draft = parseDrawingDraft({ dataUrl: VALID_DATA_URL, settings: { penWidth: 7 }, updatedAt: 1 });
		assert.equal(draft!.settings.penWidth, 7);
		assert.equal(draft!.settings.penColor, createDefaultDrawingSettings().penColor);
		assert.equal(draft!.settings.shapeKind, createDefaultDrawingSettings().shapeKind);
	});

	test('設定が無くても既定値で読める', () => {
		const draft = parseDrawingDraft({ dataUrl: VALID_DATA_URL, updatedAt: 1 });
		assert.deepEqual(draft!.settings, createDefaultDrawingSettings());
	});

	test('壊れている値は null', () => {
		assert.isNull(parseDrawingDraft(null));
		assert.isNull(parseDrawingDraft(undefined));
		assert.isNull(parseDrawingDraft('data:image/png;base64,xxx'));
		assert.isNull(parseDrawingDraft({ dataUrl: VALID_DATA_URL }));
		assert.isNull(parseDrawingDraft({ dataUrl: 'data:image/jpeg;base64,xxx', updatedAt: 1 }));
		assert.isNull(parseDrawingDraft({ dataUrl: 'https://example.com/a.png', updatedAt: 1 }));
		assert.isNull(parseDrawingDraft({ dataUrl: VALID_DATA_URL, updatedAt: Number.NaN }));
	});
});

describe('toPlainDraft', () => {
	test('リアクティブな設定でも構造化複製できる形になる', () => {
		const settings = ref(createDefaultDrawingSettings());
		const plain = toPlainDraft({ dataUrl: VALID_DATA_URL, settings: settings.value, spec: reactive({ ...DEFAULT_CANVAS_SPEC }), updatedAt: 1 });
		// indexedDB への保存は構造化複製を通るため、ここで落ちないことが保存可否を決める
		assert.doesNotThrow(() => structuredClone(plain));
		assert.deepEqual(plain.settings, createDefaultDrawingSettings());
	});
});

describe('parseDrawingDraft (キャンバス仕様)', () => {
	test('保存された大きさと下地を読める', () => {
		const draft = parseDrawingDraft({
			dataUrl: VALID_DATA_URL,
			updatedAt: 1,
			spec: { width: 1600, height: 900, background: null },
		});
		assert.deepEqual(draft!.spec, { width: 1600, height: 900, background: null });
	});

	test('仕様が無い古い下書きは既定値になる', () => {
		const draft = parseDrawingDraft({ dataUrl: VALID_DATA_URL, updatedAt: 1 });
		assert.deepEqual(draft!.spec, DEFAULT_CANVAS_SPEC);
	});

	test('異常な大きさは範囲内に丸める', () => {
		const draft = parseDrawingDraft({
			dataUrl: VALID_DATA_URL,
			updatedAt: 1,
			spec: { width: 99999, height: 0, background: '#ff0000' },
		});
		assert.equal(draft!.spec.width, 2048);
		assert.equal(draft!.spec.height, 8);
		assert.equal(draft!.spec.background, '#ff0000');
	});
});

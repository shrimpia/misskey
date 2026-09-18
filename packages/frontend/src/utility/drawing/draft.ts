/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { del, get, set } from '@/utility/idb-proxy.js';
import { DEFAULT_CANVAS_SPEC, clampCanvasSize, createDefaultDrawingSettings } from './types.js';
import type { DrawingCanvasSpec, DrawingSettings } from './types.js';

/**
 * 作業途中のキャンバス (下書き)
 *
 * idb-proxy は indexedDB が使えない環境では localStorage に JSON として退避するため、
 * Blob ではなく PNG の dataURL で保持する
 */
export type DrawingDraft = {
	/** PNG の dataURL */
	dataUrl: string;
	settings: DrawingSettings;
	spec: DrawingCanvasSpec;
	updatedAt: number;
};

/** アカウントごとに別の下書きを持つ (同一オリジンでアカウントを切り替えても混ざらないように) */
function keyOf(accountId: string): string {
	return `shrimpia:drawingDraft:${accountId}`;
}

/**
 * ストレージから読んだ値を検証して下書きに変換する。壊れていれば null
 */
function parseSpec(value: unknown): DrawingCanvasSpec {
	if (typeof value !== 'object' || value == null) return { ...DEFAULT_CANVAS_SPEC };
	const { width, height, background } = value as Partial<DrawingCanvasSpec>;
	if (typeof width !== 'number' || typeof height !== 'number') return { ...DEFAULT_CANVAS_SPEC };
	return {
		width: clampCanvasSize(width),
		height: clampCanvasSize(height),
		background: typeof background === 'string' ? background : null,
	};
}

export function parseDrawingDraft(value: unknown): DrawingDraft | null {
	if (typeof value !== 'object' || value == null) return null;
	const { dataUrl, settings, spec, updatedAt } = value as Partial<DrawingDraft>;
	if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png')) return null;
	if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) return null;
	return {
		dataUrl,
		// 設定項目が増えた後でも古い下書きを読めるように、既定値で埋める
		settings: { ...createDefaultDrawingSettings(), ...(typeof settings === 'object' && settings != null ? settings : {}) },
		spec: parseSpec(spec),
		updatedAt,
	};
}

/**
 * 保存前に素のオブジェクトへ写す。
 *
 * Vue のリアクティブプロキシをそのまま渡すと indexedDB の構造化複製が DataCloneError で落ちるため、
 * 呼び出し側が reactive な値を渡してきても安全に保存できるようにここで写し取る。
 */
export function toPlainDraft(draft: DrawingDraft): DrawingDraft {
	return {
		dataUrl: draft.dataUrl,
		settings: { ...draft.settings },
		spec: { ...draft.spec },
		updatedAt: draft.updatedAt,
	};
}

export async function loadDrawingDraft(accountId: string): Promise<DrawingDraft | null> {
	try {
		return parseDrawingDraft(await get(keyOf(accountId)));
	} catch (err) {
		console.error('failed to load drawing draft', err);
		return null;
	}
}

/** 保存できたかを返す (容量超過などで保存できなくても編集は続けられるようにするため例外は投げない) */
export async function saveDrawingDraft(accountId: string, draft: DrawingDraft): Promise<boolean> {
	try {
		await set(keyOf(accountId), toPlainDraft(draft));
		return true;
	} catch (err) {
		console.error('failed to save drawing draft', err);
		return false;
	}
}

export async function deleteDrawingDraft(accountId: string): Promise<void> {
	try {
		await del(keyOf(accountId));
	} catch (err) {
		console.error('failed to delete drawing draft', err);
	}
}

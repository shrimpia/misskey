/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Box } from './harden.js';

/** 履歴に使えるメモリの目安 */
export const HISTORY_BUDGET_BYTES = 64 * 1024 * 1024;

/**
 * 1 回の操作で書き換わった範囲と、その前後の中身。
 *
 * キャンバス全面ではなく触った矩形だけを持つので、大きなキャンバスでも回数を稼げる。
 * `target` は将来レイヤーを入れたときのレイヤー ID。今は 1 枚なので 'base' 固定
 */
export type DrawingPatch = {
	target: string;
	box: Box;
	before: ImageData;
	after: ImageData;
};

function bytesOf(patch: DrawingPatch): number {
	return patch.before.data.byteLength + patch.after.data.byteLength;
}

/**
 * 差分による Undo / Redo 履歴。
 *
 * 位置は「適用済みの差分の数」で持つ。容量を超えた分は古い側から捨てるため、
 * 捨てた数 (offset) と合わせて絶対位置で管理する
 */
export class DrawingHistory {
	private patches: DrawingPatch[] = [];
	/** 容量超過で捨てた差分の数 */
	private offset = 0;
	/** 適用済みの差分の数 (絶対位置) */
	private position = 0;
	/** 最後に保存した時点の位置 */
	private savedPosition = 0;

	constructor(private readonly budgetBytes = HISTORY_BUDGET_BYTES) {
		if (budgetBytes < 1) throw new Error('budgetBytes must be >= 1');
	}

	/** 履歴を捨てて、今の状態を保存済みとして扱う (キャンバスを作り直したときなど) */
	public clear(): void {
		this.patches = [];
		this.offset = 0;
		this.position = 0;
		this.savedPosition = 0;
	}

	public push(patch: DrawingPatch): void {
		// やり直しの先は捨てる
		this.patches.length = this.position - this.offset;
		this.patches.push(patch);
		this.position++;
		this.evict();
	}

	private evict(): void {
		while (this.patches.length > 1 && this.usedBytes > this.budgetBytes) {
			this.patches.shift();
			this.offset++;
		}
	}

	public get usedBytes(): number {
		return this.patches.reduce((total, patch) => total + bytesOf(patch), 0);
	}

	public get canUndo(): boolean {
		return this.position > this.offset;
	}

	public get canRedo(): boolean {
		return this.position - this.offset < this.patches.length;
	}

	/** 戻すべき差分を返す。呼び出し側が `before` を書き戻す */
	public undo(): DrawingPatch | null {
		if (!this.canUndo) return null;
		this.position--;
		return this.patches[this.position - this.offset];
	}

	/** 進めるべき差分を返す。呼び出し側が `after` を書き戻す */
	public redo(): DrawingPatch | null {
		if (!this.canRedo) return null;
		const patch = this.patches[this.position - this.offset];
		this.position++;
		return patch;
	}

	public markSaved(): void {
		this.savedPosition = this.position;
	}

	/** 保存した時点から変わっているか */
	public get isDirty(): boolean {
		return this.position !== this.savedPosition;
	}
}

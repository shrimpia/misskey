/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * キャンバスのスナップショットによる Undo/Redo 履歴
 *
 * ImageData に限らず任意のスナップショットを保持できるようにジェネリックにしている
 */
export class DrawingHistory<T> {
	private stack: T[] = [];
	private index = -1;
	/** 最後に保存(または初期化)した時点のスナップショット */
	private savedSnapshot: T | null = null;

	constructor(private limit = 30) {
		if (limit < 1) throw new Error('limit must be >= 1');
	}

	/** 保持件数を変える。キャンバスの大きさが変わったときに使う */
	public setLimit(limit: number): void {
		if (limit < 1) throw new Error('limit must be >= 1');
		this.limit = limit;
		if (this.stack.length > limit) {
			const removed = this.stack.length - limit;
			this.stack.splice(0, removed);
			this.index = Math.max(0, this.index - removed);
		}
	}

	/** 初期状態を設定し、履歴をリセットする */
	public reset(initial: T): void {
		this.stack = [initial];
		this.index = 0;
		this.savedSnapshot = initial;
	}

	/** 新しい状態を積む。現在位置より先の redo 履歴は破棄される */
	public push(snapshot: T): void {
		this.stack.splice(this.index + 1);
		this.stack.push(snapshot);
		if (this.stack.length > this.limit) {
			this.stack.splice(0, this.stack.length - this.limit);
		}
		this.index = this.stack.length - 1;
	}

	public get current(): T | null {
		return this.stack[this.index] ?? null;
	}

	public get canUndo(): boolean {
		return this.index > 0;
	}

	public get canRedo(): boolean {
		return this.index < this.stack.length - 1;
	}

	public undo(): T | null {
		if (!this.canUndo) return null;
		this.index--;
		return this.current;
	}

	public redo(): T | null {
		if (!this.canRedo) return null;
		this.index++;
		return this.current;
	}

	/** 現在の状態を保存済みとしてマークする */
	public markSaved(): void {
		this.savedSnapshot = this.current;
	}

	/** 保存済み(または初期)状態から変更されているか */
	public get isDirty(): boolean {
		return this.current !== this.savedSnapshot;
	}
}

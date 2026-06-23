/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// #region shrimpia なでなで機能
import { watch } from 'vue';
import type { Channels, IChannelConnection } from 'misskey-js';
import * as os from '@/os.js';
import { prefer } from '@/preferences.js';
import { useStream } from '@/stream.js';
import ShHeadPatEffect from '@/components/ShHeadPatEffect.vue';

/**
 * このクライアント（タブ）を識別するためのランダム ID。
 * 自分が送信したなでなでがストリームからエコーバックされた際、ローカルの即時再生と
 * 二重再生にならないよう、受信側で自分の送信を判別して無視するために使う。
 */
const clientId = crypto.randomUUID();

/**
 * noteId → アバター要素 の登録簿。
 * 他人のなでなでを受信したとき、その noteId が画面に表示されていれば対象アバターを引いて演出する。
 * 同一ノートが複数箇所に表示されることがあるため Set で保持する。
 */
const headPatTargets = new Map<string, Set<HTMLElement>>();

let connection: IChannelConnection<Channels['headPat']> | null = null;

/**
 * なでる演出（手の画像表示＋アイコンの潰れアニメーション）を再生する。
 * 機能フラグのチェックは行わない（リモート再生は別オプションで制御するため）。
 */
function runHeadPatAnimation(avatarEl: HTMLElement): void {
	const rect = avatarEl.getBoundingClientRect();

	const { dispose } = os.popup(ShHeadPatEffect, {
		x: rect.left,
		y: rect.top,
		size: rect.width,
	}, {
		end: () => dispose(),
	});

	avatarEl.style.transformOrigin = 'center bottom';
	avatarEl.animate([
		{ transform: 'scaleY(1)' },
		{ transform: 'scaleY(0.82) scaleX(1.04)', offset: 0.4 },
		{ transform: 'scaleY(1)' },
	], {
		duration: 200,
		easing: 'ease-out',
	});
}

/**
 * 自分がノートのアイコンを「なでる」演出を再生する。
 * `noteId` が渡され、かつストリームに接続済みであれば、他人へ配信するためにストリームへ送出する。
 */
export function playHeadPat(avatarEl: HTMLElement, noteId?: string): void {
	if (!prefer.s['shrimpia.headPattingEnabled']) return;

	runHeadPatAnimation(avatarEl);

	if (noteId != null && connection != null) {
		connection.send('pat', { noteId, clientId });
	}
}

/**
 * ノートのアバター要素を登録簿に登録する。返り値の関数を呼ぶと登録解除される。
 * 各ノートコンポーネントの onMounted / onUnmounted から使う。
 */
export function registerHeadPatTarget(noteId: string, el: HTMLElement): () => void {
	let set = headPatTargets.get(noteId);
	if (set == null) {
		set = new Set();
		headPatTargets.set(noteId, set);
	}
	set.add(el);

	return () => {
		const s = headPatTargets.get(noteId);
		if (s == null) return;
		s.delete(el);
		if (s.size === 0) headPatTargets.delete(noteId);
	};
}

function onRemotePat(payload: { noteId: string; clientId: string; }): void {
	// 「他人のなでなでを見る」が無効なら表示しない
	if (!prefer.s['shrimpia.headPattingWatchOthersEnabled']) return;
	// 自分が送ったもののエコーバックは無視（ローカルで既に再生済みのため）
	if (payload.clientId === clientId) return;

	const targets = headPatTargets.get(payload.noteId);
	if (targets == null) return;
	for (const el of targets) runHeadPatAnimation(el);
}

// 送信（なでなで機能ON）または受信（他人のなでなでを見るON）のいずれかが必要なときだけ接続を保持する
function shouldConnect(): boolean {
	return prefer.s['shrimpia.headPattingEnabled'] || prefer.s['shrimpia.headPattingWatchOthersEnabled'];
}

function ensureConnection(): void {
	if (connection != null) return;
	connection = useStream().useChannel('headPat');
	connection.on('pat', onRemotePat);
}

function closeConnection(): void {
	if (connection == null) return;
	connection.off('pat', onRemotePat);
	connection.dispose();
	connection = null;
}

function updateConnectionState(): void {
	if (shouldConnect()) {
		ensureConnection();
	} else {
		closeConnection();
	}
}

let isSetup = false;

/**
 * なでなでストリームの購読を初期化する。アプリ起動時に一度だけ呼ぶ。
 * プリファレンスの変更に追従して接続/切断を切り替える。
 */
export function setupHeadPatStream(): void {
	if (isSetup) return;
	isSetup = true;

	watch([
		prefer.r['shrimpia.headPattingEnabled'],
		prefer.r['shrimpia.headPattingWatchOthersEnabled'],
	], () => updateConnectionState(), { immediate: true });
}
// #endregion

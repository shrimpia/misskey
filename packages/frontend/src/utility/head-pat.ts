/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// #region shrimpia なでなで機能
import * as os from '@/os.js';
import { prefer } from '@/preferences.js';
import ShHeadPatEffect from '@/components/ShHeadPatEffect.vue';

/**
 * ノートのアイコンを「なでる」演出を再生する。
 * 手の画像をアイコンサイズに合わせて左上にずらして 0.3 秒表示し、
 * 同時にアイコン自身を縦に少し潰すアニメーションを再生する。
 */
export function playHeadPat(avatarEl: HTMLElement): void {
	if (!prefer.s['shrimpia.headPattingEnabled']) return;

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
// #endregion

/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';

/**
 * enabled が true の間、ページの離脱 (リロード・タブを閉じる等) 時にブラウザの確認ダイアログを出す
 */
export function useBeforeUnloadGuard(enabled: Ref<boolean>) {
	function onBeforeUnload(ev: BeforeUnloadEvent) {
		if (!enabled.value) return;
		ev.preventDefault();
		// 古いブラウザ向け
		ev.returnValue = '';
	}

	onMounted(() => {
		window.addEventListener('beforeunload', onBeforeUnload);
	});

	onUnmounted(() => {
		window.removeEventListener('beforeunload', onBeforeUnload);
	});
}

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// #region shrimpia ニックネーム機能のため、userName のみ frontend 側で上書きする (本家は @@/js/user.js に移動済み)
import * as Misskey from 'misskey-js';
import { prefer } from '@/preferences.js';

export { acct, userPage } from '@@/js/user.js';

export const userName = (user: Misskey.entities.User) => {
	if (!prefer.s['ebisskey.nicknameEnabled']) {
		return user.name ?? user.username;
	}
	return prefer.r['ebisskey.nicknameMap'].value[user.id] || user.name || user.username;
};
// #endregion

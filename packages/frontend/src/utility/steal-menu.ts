import { pleaseLogin } from './please-login.js';
import type { Note } from 'misskey-js/entities.js';
import type { MenuItem } from '@/types/menu.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { alert, confirm, popupMenu, post } from '@/os.js';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';

// #region shrimpia
export function stealMenu(note: Note, el?: HTMLElement) {
	pleaseLogin();
	const menuItems: MenuItem[] = [];
	if (prefer.s['ebisskey.stealEnabled']) {
		menuItems.push(...[{
			icon: 'ti ti-swipe',
			text: 'パクる',
			action: async () => {
				if (!note.text) return;
				if (!prefer.s['ebisskey.stealConfirmed']) {
					const { canceled } = await confirm({
						type: 'warning',
						text: 'このノートをパクります。本文をコピーして投稿するため、相手に迷惑がかからないことを確認する必要があります。\n本当に投稿しますか？',
					});
					if (canceled) return;
				}
				prefer.commit('ebisskey.stealConfirmed', true);
				if (note.visibility === 'followers' || note.visibility === 'specified') {
					const { canceled } = await confirm({
						type: 'warning',
						text: `このノートは公開範囲を「${i18n.ts._visibility[note.visibility]}」に設定しているため、パクるべきではないかもしれません。それでも続行しますか？`,
					});
					if (canceled) return;
				}
				const visibility = prefer.s['ebisskey.defaultNumberQuoteVisibility'] === 'inherits'
					? note.visibility
					: prefer.s['ebisskey.defaultNumberQuoteVisibility'];
				const localOnly = prefer.s['ebisskey.defaultNumberQuoteVisibility'] === 'inherits'
					? note.localOnly
					: prefer.s['ebisskey.defaultNumberQuoteLocalOnly'];
				misskeyApi('notes/create', {
					text: note.text,
					visibility: visibility as never,
					localOnly,
					renoteId: note.renoteId,
					replyId: note.replyId,
					cw: note.cw,
					channelId: note.channelId,
				});
			},
		}, {
			icon: 'ti ti-edit',
			text: '編集してパクる',
			action: async () => {
				if (!note.text) return;
				const visibility = prefer.s['ebisskey.defaultNumberQuoteVisibility'] === 'inherits'
					? note.visibility
					: prefer.s['ebisskey.defaultNumberQuoteVisibility'];
				const localOnly = prefer.s['ebisskey.defaultNumberQuoteVisibility'] === 'inherits'
					? note.localOnly
					: prefer.s['ebisskey.defaultNumberQuoteLocalOnly'];
				post({
					initialText: note.text,
					initialVisibility: visibility,
					initialLocalOnly: localOnly,
					instant: true,
				});
			},
		}]);
	}

	popupMenu([...menuItems, { type: 'divider' }, {
		text: i18n.ts.help,
		icon: 'ti ti-help-circle',
		action: async () => {
			alert({
				type: 'info',
				title: '「パクる」機能について',
				text: '「パクる」は、このノートの本文をコピーして投稿します。\n\n「編集してパクる」は、このノートの本文をコピーして新たな投稿フォームを表示します。\n\nどちらも投稿の複製に当たるため、相手が不快に思わないよう使ってください。',
			});
		},
	}], el);
}

// #endregion

import { Note } from 'misskey-js/built/entities';
import { getTextLastNumeric, getTextWithoutEndingNumeric } from './get-note-last-numeric';
import { pleaseLogin } from './please-login';
import { misskeyApi } from '@/scripts/misskey-api.js';
import * as sound from '@/scripts/sound.js';
import { defaultStore } from '@/store';
import { alert, confirm, popupMenu, post } from '@/os';
import { i18n } from '@/i18n';
import { MenuItem } from '@/types/menu';

// #region shrimpia
export function stealMenu(note: Note, el: HTMLElement) {
	pleaseLogin();
	const menuItems: MenuItem[] = [];

	if (defaultStore.state.numberQuoteEnabled) {
		const nextNumeric = getTextLastNumeric(note.text ?? '') + 1;
		const nextNumericOnesPlace = nextNumeric % 10;
		menuItems.push({
			icon: `ti ti-box-multiple-${Math.abs(nextNumericOnesPlace)}`,
			text: '数字引用',
			action: async () => {
				if (!note.text) return;
				if (!defaultStore.state.numberQuoteConfirmed) {
					const { canceled } = await confirm({
						type: 'warning',
						text: 'このノートを数字引用します。本文をコピーして投稿するため、相手に迷惑がかからないことを確認する必要があります。\n本当に投稿しますか？',
					});
					if (canceled) return;
				}
				await defaultStore.set('numberQuoteConfirmed', true);
				if (note.visibility === 'followers' || note.visibility === 'specified') {
					const { canceled } = await confirm({
						type: 'warning',
						text: `このノートは公開範囲を「${i18n.ts._visibility[note.visibility]}」に設定しているため、数字引用すべきではないかもしれません。それでも続行しますか？`,
					});
					if (canceled) return;
				}
				let baseText = getTextWithoutEndingNumeric(note.text);
				// タグ対策
				if (baseText.endsWith('</center>')) baseText += '\n';
				// ハッシュタグ対策
				if (/#[^ ]+$/.test(baseText)) baseText += ' ';
				// 絵文字ショートコード対策
				if (baseText.endsWith(':')) baseText += ' ';

				const visibility = defaultStore.state.defaultNumberQuoteVisibility === 'inherits'
					? note.visibility
					: defaultStore.state.defaultNumberQuoteVisibility;
				const localOnly = defaultStore.state.defaultNumberQuoteVisibility === 'inherits'
					? note.localOnly
					: defaultStore.state.defaultNumberQuoteLocalOnly;
				misskeyApi('notes/create', {
					text: baseText + nextNumeric,
					visibility: visibility as never,
					localOnly,
					renoteId: note.renoteId,
					replyId: note.replyId,
					cw: note.cw,
					channelId: note.channelId,
				}).then(() => {
					if (nextNumericOnesPlace !== 4) return;
					sound.playMisskeySfxFile({
						type: 'shrimpia/4',
						volume: 0.5,
					});
				});
			},
		});
	}

	if (defaultStore.state.stealEnabled) {
		menuItems.push(...[{
			icon: 'ti ti-swipe',
			text: 'パクる',
			action: async () => {
				if (!note.text) return;
				if (!defaultStore.state.stealConfirmed) {
					const { canceled } = await confirm({
						type: 'warning',
						text: 'このノートをパクります。本文をコピーして投稿するため、相手に迷惑がかからないことを確認する必要があります。\n本当に投稿しますか？',
					});
					if (canceled) return;
				}
				defaultStore.set('stealConfirmed', true);
				if (note.visibility === 'followers' || note.visibility === 'specified') {
					const { canceled } = await confirm({
						type: 'warning',
						text: `このノートは公開範囲を「${i18n.ts._visibility[note.visibility]}」に設定しているため、パクるべきではないかもしれません。それでも続行しますか？`,
					});
					if (canceled) return;
				}
				const visibility = defaultStore.state.defaultNumberQuoteVisibility === 'inherits'
					? note.visibility
					: defaultStore.state.defaultNumberQuoteVisibility;
				const localOnly = defaultStore.state.defaultNumberQuoteVisibility === 'inherits'
					? note.localOnly
					: defaultStore.state.defaultNumberQuoteLocalOnly;
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
				const visibility = defaultStore.state.defaultNumberQuoteVisibility === 'inherits'
					? note.visibility
					: defaultStore.state.defaultNumberQuoteVisibility;
				const localOnly = defaultStore.state.defaultNumberQuoteVisibility === 'inherits'
					? note.localOnly
					: defaultStore.state.defaultNumberQuoteLocalOnly;
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
		icon: 'ti ti-question-circle',
		action: async () => {
			alert({
				type: 'info',
				title: '数字引用・パクる',
				text: '「パクる」は、そのままこのノートの本文をコピーして投稿します。\n\n「数字引用」は、コピーした上で本文の末尾にある数値を1増分するか、なければ「2」を付与して投稿します。\n\nどちらも投稿の複製に当たるため、相手が不快に思わないよう使ってください。',
			});
		},
	}], el);
}

// #endregion

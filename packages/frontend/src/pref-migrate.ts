/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DeckProfile } from '@/deck.js';
import { genId } from '@/utility/id.js';
import { ColdDeviceStorage, store } from '@/store.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { deckStore } from '@/ui/deck/deck-store.js';
import { unisonReload } from '@/utility/unison-reload.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';

// TODO: そのうち消す
export function migrateOldSettings() {
	os.waiting({ text: i18n.ts.settingsMigrating });

	store.loaded.then(async () => {
		misskeyApi('i/registry/get', { scope: ['client'], key: 'themes' }).catch(() => []).then((themes: any) => {
			if (themes.length > 0) {
				prefer.commit('themes', themes);
			}
		});

		const plugins = ColdDeviceStorage.get('plugins');
		prefer.commit('plugins', plugins.map(p => ({
			...p,
			installId: (p as any).id,
			id: undefined,
		})));

		prefer.commit('deck.profile', deckStore.s.profile);
		misskeyApi('i/registry/keys', {
			scope: ['client', 'deck', 'profiles'],
		}).then(async keys => {
			const profiles: DeckProfile[] = [];
			for (const key of keys) {
				const deck = await misskeyApi('i/registry/get', {
					scope: ['client', 'deck', 'profiles'],
					key: key,
				});
				profiles.push({
					id: genId(),
					name: key,
					columns: deck.columns,
					layout: deck.layout,
				});
			}
			prefer.commit('deck.profiles', profiles);
		});

		prefer.commit('lightTheme', ColdDeviceStorage.get('lightTheme'));
		prefer.commit('darkTheme', ColdDeviceStorage.get('darkTheme'));
		prefer.commit('syncDeviceDarkMode', ColdDeviceStorage.get('syncDeviceDarkMode'));
		prefer.commit('emojiPalettes', [{
			id: 'reactions',
			name: '',
			emojis: store.s.reactions,
		}, {
			id: 'pinnedEmojis',
			name: '',
			emojis: store.s.pinnedEmojis,
		}]);
		prefer.commit('emojiPaletteForMain', 'pinnedEmojis');
		prefer.commit('emojiPaletteForReaction', 'reactions');
		prefer.commit('overridedDeviceKind', store.s.overridedDeviceKind);
		prefer.commit('widgets', store.s.widgets);
		prefer.commit('keepCw', store.s.keepCw);
		prefer.commit('collapseRenotes', store.s.collapseRenotes);
		prefer.commit('rememberNoteVisibility', store.s.rememberNoteVisibility);
		prefer.commit('uploadFolder', store.s.uploadFolder);
		prefer.commit('menu', [...store.s.menu, 'chat']);
		prefer.commit('statusbars', store.s.statusbars);
		prefer.commit('pinnedUserLists', store.s.pinnedUserLists);
		prefer.commit('serverDisconnectedBehavior', store.s.serverDisconnectedBehavior);
		prefer.commit('nsfw', store.s.nsfw);
		prefer.commit('highlightSensitiveMedia', store.s.highlightSensitiveMedia);
		prefer.commit('animation', store.s.animation);
		prefer.commit('animatedMfm', store.s.animatedMfm);
		prefer.commit('advancedMfm', store.s.advancedMfm);
		prefer.commit('showReactionsCount', store.s.showReactionsCount);
		prefer.commit('enableQuickAddMfmFunction', store.s.enableQuickAddMfmFunction);
		prefer.commit('loadRawImages', store.s.loadRawImages);
		prefer.commit('imageNewTab', store.s.imageNewTab);
		prefer.commit('disableShowingAnimatedImages', store.s.disableShowingAnimatedImages);
		prefer.commit('emojiStyle', store.s.emojiStyle);
		prefer.commit('menuStyle', store.s.menuStyle);
		prefer.commit('useBlurEffectForModal', store.s.useBlurEffectForModal);
		prefer.commit('useBlurEffect', store.s.useBlurEffect);
		prefer.commit('showFixedPostForm', store.s.showFixedPostForm);
		prefer.commit('showFixedPostFormInChannel', store.s.showFixedPostFormInChannel);
		prefer.commit('enableInfiniteScroll', store.s.enableInfiniteScroll);
		prefer.commit('useReactionPickerForContextMenu', store.s.useReactionPickerForContextMenu);
		prefer.commit('instanceTicker', store.s.instanceTicker);
		prefer.commit('emojiPickerScale', store.s.emojiPickerScale);
		prefer.commit('emojiPickerWidth', store.s.emojiPickerWidth);
		prefer.commit('emojiPickerHeight', store.s.emojiPickerHeight);
		prefer.commit('emojiPickerStyle', store.s.emojiPickerStyle);
		prefer.commit('reportError', store.s.reportError);
		prefer.commit('squareAvatars', store.s.squareAvatars);
		prefer.commit('showAvatarDecorations', store.s.showAvatarDecorations);
		prefer.commit('numberOfPageCache', store.s.numberOfPageCache);
		prefer.commit('showNoteActionsOnlyHover', store.s.showNoteActionsOnlyHover);
		prefer.commit('showClipButtonInNoteFooter', store.s.showClipButtonInNoteFooter);
		prefer.commit('reactionsDisplaySize', store.s.reactionsDisplaySize);
		prefer.commit('limitWidthOfReaction', store.s.limitWidthOfReaction);
		prefer.commit('forceShowAds', store.s.forceShowAds);
		prefer.commit('aiChanMode', store.s.aiChanMode);
		prefer.commit('devMode', store.s.devMode);
		prefer.commit('mediaListWithOneImageAppearance', store.s.mediaListWithOneImageAppearance);
		prefer.commit('notificationPosition', store.s.notificationPosition);
		prefer.commit('notificationStackAxis', store.s.notificationStackAxis);
		prefer.commit('enableCondensedLine', store.s.enableCondensedLine);
		prefer.commit('keepScreenOn', store.s.keepScreenOn);
		prefer.commit('useGroupedNotifications', store.s.useGroupedNotifications);
		prefer.commit('dataSaver', store.s.dataSaver);
		prefer.commit('enableSeasonalScreenEffect', store.s.enableSeasonalScreenEffect);
		prefer.commit('enableHorizontalSwipe', store.s.enableHorizontalSwipe);
		prefer.commit('useNativeUiForVideoAudioPlayer', store.s.useNativeUIForVideoAudioPlayer);
		prefer.commit('keepOriginalFilename', store.s.keepOriginalFilename);
		prefer.commit('alwaysConfirmFollow', store.s.alwaysConfirmFollow);
		prefer.commit('confirmWhenRevealingSensitiveMedia', store.s.confirmWhenRevealingSensitiveMedia);
		prefer.commit('contextMenu', store.s.contextMenu);
		prefer.commit('skipNoteRender', store.s.skipNoteRender);
		prefer.commit('showSoftWordMutedWord', store.s.showSoftWordMutedWord);
		prefer.commit('confirmOnReact', store.s.confirmOnReact);
		prefer.commit('defaultFollowWithReplies', store.s.defaultWithReplies);
		prefer.commit('sound.masterVolume', store.s.sound_masterVolume);
		prefer.commit('sound.notUseSound', store.s.sound_notUseSound);
		prefer.commit('sound.useSoundOnlyWhenActive', store.s.sound_useSoundOnlyWhenActive);
		prefer.commit('sound.on.note', store.s.sound_note as any);
		prefer.commit('sound.on.noteMy', store.s.sound_noteMy as any);
		prefer.commit('sound.on.notification', store.s.sound_notification as any);
		prefer.commit('sound.on.reaction', store.s.sound_reaction as any);
		prefer.commit('defaultNoteVisibility', store.s.defaultNoteVisibility);
		prefer.commit('defaultNoteLocalOnly', store.s.defaultNoteLocalOnly);
		prefer.commit('ebisskey.nicknameEnabled', store.s.nicknameEnabled);
		prefer.commit('ebisskey.stealEnabled', store.s.stealEnabled);
		prefer.commit('ebisskey.infoButtonForNoteActionsEnabled', store.s.infoButtonForNoteActionsEnabled);
		prefer.commit('ebisskey.featuredTimelineEnabled', store.s.featuredTimelineEnabled);
		prefer.commit('ebisskey.useAirReply', store.s.useAirReply);
		prefer.commit('ebisskey.airReplyButtonPlacement', store.s.airReplyButtonPlacement);
		prefer.commit('ebisskey.useNoteVisibilityColoring', store.s.useNoteVisibilityColoring);
		prefer.commit('ebisskey.noteVisibilityColorHome', store.s.noteVisibilityColorHome);
		prefer.commit('ebisskey.noteVisibilityColorFollowers', store.s.noteVisibilityColorFollowers);
		prefer.commit('ebisskey.noteVisibilityColorSpecified', store.s.noteVisibilityColorSpecified);
		prefer.commit('ebisskey.noteVisibilityColorLocalOnly', store.s.noteVisibilityColorLocalOnly);
		prefer.commit('ebisskey.useTextAreaAutoSize', store.s.useTextAreaAutoSize);
		prefer.commit('ebisskey.ebiNoteViewEnabledLab', store.s.ebiNoteViewEnabledLab);
		prefer.commit('ebisskey.useDefaultNoteVisibilityOnRenote', store.s.useDefaultNoteVisibilityOnRenote);
		prefer.commit('ebisskey.showPostFormPreview', store.s.showPostFormPreview);
		prefer.commit('ebisskey.defaultRenoteVisibility', store.s.defaultRenoteVisibility);
		prefer.commit('ebisskey.defaultRenoteLocalOnly', store.s.defaultRenoteLocalOnly);
		prefer.commit('ebisskey.defaultNumberQuoteVisibility', store.s.defaultNumberQuoteVisibility);
		prefer.commit('ebisskey.defaultNumberQuoteLocalOnly', store.s.defaultNumberQuoteLocalOnly);
		prefer.commit('ebisskey.stealConfirmed', store.s.stealConfirmed);
		prefer.commit('ebisskey.showTimelineOnUserHome', store.s.showTimelineOnUserHome);
		prefer.commit('ebisskey.nicknameMap', store.s.nicknameMap);

		window.setTimeout(() => {
			unisonReload();
		}, 10000);
	});
}

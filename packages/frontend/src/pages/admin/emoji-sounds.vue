<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px;">
		<div class="_gaps_m">
			<MkInfo>
				絵文字リアクションに音を紐づけられます。設定した絵文字でリアクションすると、カスタム音が再生されます。
			</MkInfo>

			<div v-if="emojiSounds.length === 0" class="_panel" style="padding: 32px; text-align: center;">
				<div style="margin-bottom: 16px;">まだサウンドリアクションが設定されていません</div>
				<MkButton primary @click="add">
					<i class="ti ti-plus"></i> 追加
				</MkButton>
			</div>

			<div v-else>
				<div v-for="item in emojiSounds" :key="item.id" class="_panel _gaps_m" :class="$style.item">
					<div :class="$style.header">
						<div :class="$style.reaction">
							<span :class="$style.emoji">
								<Mfm :text="item.reaction" :inline="true" :disableLinks="true"/>
							</span>
							<code :class="$style.reactionText">{{ item.reaction }}</code>
						</div>
						<div :class="$style.actions">
							<button class="_button" :class="$style.actionButton" @click="preview(item)">
								<i class="ti ti-player-play"></i>
							</button>
							<button class="_button" :class="$style.actionButton" @click="edit(item)">
								<i class="ti ti-edit"></i>
							</button>
							<button class="_button" :class="$style.actionButton" @click="remove(item)">
								<i class="ti ti-trash"></i>
							</button>
						</div>
					</div>
					<div :class="$style.info">
						<div :class="$style.infoItem">
							<i class="ti ti-file"></i>
							<span>{{ item.file.name }}</span>
						</div>
						<div :class="$style.infoItem">
							<i class="ti ti-volume"></i>
							<span>{{ Math.round(item.volume * 100) }}%</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';
import { definePage } from '@/page.js';
import { playUrl } from '@/utility/sound.js';

type EmojiSound = {
	id: string;
	reaction: string;
	file: {
		id: string;
		name: string;
		url: string;
	};
	volume: number;
	createdAt: string;
	updatedAt: string | null;
};

const emojiSounds = ref<EmojiSound[]>([]);

async function fetchEmojiSounds() {
	const res = await misskeyApi('admin/emoji-sounds/list');
	emojiSounds.value = res;
}

function add() {
	const { dispose } = os.popup(defineAsyncComponent(() => import('@/components/MkEmojiSoundDialog.vue')), {
		item: null,
	}, {
		done: async (result) => {
			await os.apiWithDialog('admin/emoji-sounds/set', {
				reaction: result.reaction,
				fileId: result.fileId,
				volume: result.volume,
			});
			fetchEmojiSounds();
		},
		closed: () => dispose(),
	});
}

function edit(item: EmojiSound) {
	const { dispose } = os.popup(defineAsyncComponent(() => import('@/components/MkEmojiSoundDialog.vue')), {
		item: item,
	}, {
		done: async (result) => {
			await os.apiWithDialog('admin/emoji-sounds/set', {
				reaction: result.reaction,
				fileId: result.fileId,
				volume: result.volume,
			});
			fetchEmojiSounds();
		},
		closed: () => dispose(),
	});
}

async function remove(item: EmojiSound) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: `${item.reaction} のサウンド設定を削除しますか?`,
	});

	if (canceled) return;

	await os.apiWithDialog('admin/emoji-sounds/delete', {
		id: item.id,
	});

	fetchEmojiSounds();
}

async function preview(item: EmojiSound) {
	await playUrl(item.file.url, {
		volume: item.volume,
	});
}

const headerActions = computed(() => [{
	asFullButton: true,
	icon: 'ti ti-plus',
	text: '追加',
	handler: add,
}]);

const headerTabs = computed(() => []);

onMounted(() => {
	fetchEmojiSounds();
});

definePage(() => ({
	title: 'サウンドリアクション',
	icon: 'ti ti-music',
}));
</script>

<style lang="scss" module>
.item {
	padding: 16px;

	&:not(:last-child) {
		margin-bottom: var(--MI-margin);
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.reaction {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1;
	min-width: 0;
}

.emoji {
	font-size: 2em;
	line-height: 1;
	flex-shrink: 0;
}

.reactionText {
	padding: 4px 8px;
	background: var(--MI_THEME-buttonBg);
	border-radius: 4px;
	font-size: 0.9em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	gap: 8px;
	flex-shrink: 0;
}

.actionButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 6px;
	background: var(--MI_THEME-buttonBg);
	transition: background 0.1s ease;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	> i {
		font-size: 18px;
	}
}

.info {
	display: flex;
	gap: 16px;
	flex-wrap: wrap;
	font-size: 0.9em;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.75);
}

.infoItem {
	display: flex;
	align-items: center;
	gap: 6px;

	> i {
		font-size: 16px;
	}
}
</style>

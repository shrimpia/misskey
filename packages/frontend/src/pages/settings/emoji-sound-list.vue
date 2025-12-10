<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<MkInfo>
		サーバーに登録されているサウンドリアクションの一覧です。絵文字をクリックすると音が再生されます。
	</MkInfo>

	<div v-if="Object.keys(emojiSounds).length === 0" class="_panel" style="padding: 32px; text-align: center;">
		<div>サウンドリアクションが登録されていません</div>
	</div>

	<div v-else>
		<div v-for="(item, key) in emojiSounds" :key="key" class="_panel _gaps_m" :class="$style.item">
			<div :class="$style.header">
				<button type="button" class="_button" :class="$style.reaction" @click="previewSoundReaction(key)">
					<span :class="$style.emoji">
						<MkCustomEmoji
							v-if="key.startsWith(':')"
							:name="key"
							:size="32"
							:disableLink="true"
						/>
						<MkEmoji
							v-else
							:emoji="key"
							:size="32"
						/>
					</span>
					<code :class="$style.reactionText">{{ key }}</code>
				</button>
			</div>
			<div :class="$style.info">
				<div :class="$style.infoItem">
					<i class="ti ti-volume"></i>
					<span>{{ Math.round(item.volume * 100) }}%</span>
				</div>
				<div v-if="item.license" :class="$style.infoItem">
					<i class="ti ti-license"></i>
					<span>{{ item.license }}</span>
				</div>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkInfo from '@/components/MkInfo.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as sound from '@/utility/sound.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';

const emojiSounds = ref<Record<string, { url: string; volume: number; license: string | null }>>({});

async function fetchEmojiSounds() {
	const res = await misskeyApi('emoji-sounds');
	emojiSounds.value = res as Record<string, { url: string; volume: number; license: string | null }>;
}

async function previewSoundReaction(reaction: string) {
	const s = emojiSounds.value[reaction];
	if (!s) return;

	await sound.playUrl(s.url, {
		volume: s.volume,
	});
}

onMounted(() => {
	fetchEmojiSounds();
});

definePage({
	title: 'サウンドリアクション一覧',
	icon: 'ti ti-music',
});
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
	padding: 8px 12px;
	background: var(--MI_THEME-buttonBg);
	border-radius: 6px;
	transition: background 0.1s ease;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.emoji {
	font-size: 2em;
	line-height: 1;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.reactionText {
	padding: 4px 8px;
	background: var(--MI_THEME-bg);
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
	width: 40px;
	height: 40px;
	border-radius: 6px;
	background: var(--MI_THEME-buttonBg);
	transition: background 0.1s ease;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	> i {
		font-size: 20px;
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

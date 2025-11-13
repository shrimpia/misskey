<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkWindow
	ref="windowEl"
	:initialWidth="400"
	:initialHeight="500"
	:canResize="true"
	@close="windowEl?.close()"
	@closed="emit('closed')"
>
	<template #header>
		<i class="ti ti-music"></i>
		{{ item?.id ? 'サウンドリアクションを編集' : 'サウンドリアクションを追加' }}
	</template>

	<div :class="$style.body">
		<!-- 絵文字選択 -->
		<div :class="$style.formItem">
			<div :class="$style.formLabel">
				<i class="ti ti-mood-smile"></i>
				絵文字
			</div>
			<button
				v-if="!item?.id"
				class="_button"
				:class="$style.emojiButton"
				@click="selectEmoji"
			>
				<Mfm v-if="reaction" :text="reaction" :inline="true" :disableLinks="true"/>
				<span v-else :class="$style.emojiPlaceholder">絵文字を選択</span>
				<i class="ti ti-chevron-down"></i>
			</button>
			<div v-else :class="$style.emojiReadonly">
				<span :class="$style.selectedEmoji">{{ reaction }}</span>
				<span :class="$style.emojiNote">（編集時は変更できません）</span>
			</div>
		</div>

		<!-- サウンドファイル選択 -->
		<div :class="$style.formItem">
			<div :class="$style.formLabel">
				<i class="ti ti-file-music"></i>
				サウンドファイル
			</div>
			<button class="_button" :class="$style.fileButton" @click="selectFile">
				<span v-if="fileId" :class="$style.fileName">
					<i class="ti ti-file"></i>
					{{ fileName || 'ファイルが選択されています' }}
				</span>
				<span v-else :class="$style.filePlaceholder">
					<i class="ti ti-upload"></i>
					ファイルを選択
				</span>
			</button>
		</div>

		<!-- プレビュー -->
		<div v-if="fileId && fileUrl" :class="$style.formItem">
			<MkButton :class="$style.previewButton" @click="preview">
				<i class="ti ti-player-play"></i>
				プレビュー
			</MkButton>
		</div>

		<!-- 音量調整 -->
		<div :class="$style.formItem">
			<div :class="$style.formLabel">
				<i class="ti ti-volume"></i>
				音量: {{ Math.round(volume * 100) }}%
			</div>
			<MkRange
				v-model="volume"
				:min="0"
				:max="1"
				:step="0.01"
				:textConverter="(v) => `${Math.round(v * 100)}%`"
				continuousUpdate
			/>
		</div>
		<div :class="$style.footer">
			<MkButton primary rounded style="margin: 0 auto;" @click="save">
				<i class="ti ti-check"></i> {{ props.item ? i18n.ts.update : i18n.ts.create }}
			</MkButton>
		</div>
	</div>
</MkWindow>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkWindow from '@/components/MkWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkRange from '@/components/MkRange.vue';
import * as os from '@/os.js';
import { playUrl } from '@/utility/sound.js';
import { selectFile as selectDriveFile } from '@/utility/drive.js';
import { i18n } from '@/i18n.js';

type Props = {
	item?: {
		id: string;
		reaction: string;
		file: {
			id: string;
			name: string;
			url: string;
		};
		volume: number;
	} | null;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	(ev: 'done', result: { reaction: string; fileId: string; volume: number }): void;
	(ev: 'closed'): void;
}>();

const windowEl = ref<InstanceType<typeof MkWindow>>();
const reaction = ref(props.item?.reaction || '');
const fileId = ref(props.item?.file.id || '');
const fileName = ref(props.item?.file.name || '');
const fileUrl = ref(props.item?.file.url || '');
const volume = ref(props.item?.volume ?? 1);

const canSave = computed(() => {
	return reaction.value && fileId.value;
});

async function selectEmoji(ev: MouseEvent) {
	const target = (ev.currentTarget ?? ev.target) as HTMLElement;
	const emoji = await os.pickEmoji(target, {});
	reaction.value = emoji;
}

async function selectFile(ev: MouseEvent) {
	try {
		const file = await selectDriveFile({
			anchorElement: ev.currentTarget ?? ev.target,
			multiple: false,
		});

		fileId.value = file.id;
		fileName.value = file.name;
		fileUrl.value = file.url;
	} catch (e) {
		// キャンセルされた場合
		return;
	}
}

async function preview() {
	if (!fileUrl.value) return;
	await playUrl(fileUrl.value, {
		volume: volume.value,
	});
}

function save() {
	if (!canSave.value) return;

	emit('done', {
		reaction: reaction.value,
		fileId: fileId.value,
		volume: volume.value,
	});

	windowEl.value?.close();
}

function cancel() {
	windowEl.value?.close();
}
</script>

<style lang="scss" module>
.body {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.formItem {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.formLabel {
	font-size: 0.9em;
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--MI_THEME-fg);
}

.emojiButton {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: var(--MI_THEME-buttonBg);
	border-radius: 6px;
	transition: background 0.1s ease;
	gap: 8px;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.selectedEmoji {
	font-size: 1.5em;
	line-height: 1;
}

.emojiPlaceholder {
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.5);
}

.emojiReadonly {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	background: var(--MI_THEME-bg);
	border-radius: 6px;
}

.emojiNote {
	font-size: 0.85em;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.5);
}

.fileButton {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 12px 16px;
	background: var(--MI_THEME-buttonBg);
	border-radius: 6px;
	transition: background 0.1s ease;
	gap: 8px;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.fileName {
	display: flex;
	align-items: center;
	gap: 8px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.filePlaceholder {
	display: flex;
	align-items: center;
	gap: 8px;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.5);
}

.previewButton {
	width: 100%;
}
</style>

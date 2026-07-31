<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<MkButton v-if="$i && ($i.isModerator || $i.policies.canManageCustomEmojis)" primary type="routerLink" to="/custom-emojis-manager">{{ i18n.ts.manageCustomEmojis }}</MkButton>

	<div class="query">
		<MkInput v-model="q" class="" :placeholder="i18n.ts.search" autocapitalize="off">
			<template #prefix><i class="ti ti-search"></i></template>
		</MkInput>
	</div>

	<MkFoldableSection v-if="searchEmojis">
		<template #header>{{ i18n.ts.searchResult }}</template>
		<div :class="$style.emojis">
			<XEmoji v-for="emoji in searchEmojis" :key="emoji.name" :emoji="emoji"/>
		</div>
	</MkFoldableSection>

	<MkFoldableSection v-for="category in customEmojiCategories" v-once :key="category ?? '___root___'" :expanded="false">
		<template #header>{{ category || i18n.ts.other }}</template>
		<div :class="$style.emojis">
			<XEmoji v-for="emoji in searchableCustomEmojis.filter(e => e.category === category)" :key="emoji.name" :emoji="emoji"/>
		</div>
	</MkFoldableSection>
</div>
</template>

<script lang="ts" setup>
import { watch, ref } from 'vue';
import * as Misskey from 'misskey-js';
import XEmoji from './emojis.emoji.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import { customEmojis, customEmojiCategories, customEmojisMap, searchableCustomEmojis } from '@/custom-emojis.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';

const q = ref('');
const searchEmojis = ref<Misskey.entities.EmojiSimple[] | null>(null);

function search() {
	if (q.value === '' || q.value == null) {
		searchEmojis.value = null;
		return;
	}

	const queryarry = q.value.match(/\:([a-z0-9_]*)\:/g);

	if (queryarry) {
		// #region shrimpia `:name:` 形式は完全一致なので隠し絵文字も対象にする
		searchEmojis.value = customEmojis.value.filter(emoji =>
			queryarry.includes(`:${emoji.name}:`),
		);
		// #endregion
	} else {
		// #region shrimpia 部分一致では隠し絵文字を出さないが、名前の完全一致なら出す
		const exactMatch = customEmojisMap.get(q.value);
		searchEmojis.value = [
			...(exactMatch?.isHidden ? [exactMatch] : []),
			...searchableCustomEmojis.value.filter(emoji => emoji.name.includes(q.value) || emoji.aliases.includes(q.value)),
		];
		// #endregion
	}
}

watch(q, () => {
	search();
});
</script>

<style lang="scss" module>
.emojis {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
	grid-gap: 12px;
}
</style>

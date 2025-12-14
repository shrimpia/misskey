<!--
SPDX-FileCopyrightText: shrimpia
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal ref="modal" :preferType="'dialog'" :zPriority="'high'" @click="closeDialog" @closed="emit('closed')" @esc="closeDialog">
	<div :class="$style.root">
		<header :class="$style.title">
			<i :class="[article.iconClass, $style.icon]"/>
			<Mfm :text="title"/>
		</header>
		<div :class="$style.text">
			<Mfm :text="article.text"/>
		</div>
		<MkA
			v-if="article.link && !article.isExternalLink"
			class="_link"
			:to="article.link ?? ''"
			@click="closeDialog"
		>
			詳細を見る
		</MkA>
		<a
			v-else-if="article.link && article.isExternalLink"
			class="_link"
			:href="article.link"
			target="_blank"
			rel="noopener"
		>
			<i class="ti ti-external-link"/> 詳細を見る
		</a>
		<div v-if="article.link" :class="$style.actions">
		</div>
		<div :class="$style.buttons">
			<MkButton inline rounded @click="closeDialog">{{ i18n.ts.close }}</MkButton>
		</div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue';
import MkModal from '@/components/MkModal.vue';
import MkButton from '@/components/MkButton.vue';
import MkA from '@/components/global/MkA.vue';
import { i18n } from '@/i18n.js';

type Article = {
	type: 'event' | 'hint' | 'announcement';
	title: string;
	text: string;
	iconClass: string;
	link?: string;
	isExternalLink?: boolean;
};

const props = defineProps<{
	article: Article;
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const modal = useTemplateRef('modal');

const title = computed(() => {
	if (props.article.title) {
		return props.article.title;
	}
	switch (props.article.type) {
		case 'event': return 'イベント';
		case 'hint': return 'ヒント';
		case 'announcement': return 'お知らせ';
		default: return '';
	}
});

function closeDialog() {
	modal.value?.close();
}
</script>

<style lang="scss" module>
.root {
	position: relative;
	margin: auto;
	padding: 32px;
	min-width: 320px;
	max-width: 600px;
	box-sizing: border-box;
	background: var(--MI_THEME-panel);
	border-radius: 16px;
}

.icon {
	margin-right: 8px;
	font-size: 1.5em;
	vertical-align: middle;
}

.title {
	margin: 0 0 16px 0;
	font-weight: bold;
	font-size: 1.2em;
}

.text {
	margin: 16px 0;
	white-space: pre-wrap;
	word-wrap: break-word;
	line-height: 1.5;
}

.actions {
	margin-top: 24px;
	display: flex;
	justify-content: center;
	gap: 8px;
}

.linkButton {
	text-decoration: none;
}

.buttons {
	margin-top: 16px;
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	justify-content: center;
}
</style>

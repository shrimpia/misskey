<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<!-- #region shrimpia ドライブの種別・登録日でのフィルタダイアログ -->
<template>
<MkModalWindow
	ref="dialog"
	:width="450"
	:withOkButton="true"
	@click="cancel()"
	@close="cancel()"
	@ok="ok()"
	@closed="emit('closed')"
>
	<template #header>{{ i18n.ts.filter }}</template>
	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 28px;">
		<div class="_gaps">
			<MkRadios v-model="type" :options="typeOptions" vertical>
				<template #label>{{ i18n.ts.type }}</template>
			</MkRadios>
			<MkInput v-model="from" type="date">
				<template #label>{{ i18n.ts.startingperiod }}</template>
			</MkInput>
			<MkInput v-model="until" type="date">
				<template #label>{{ i18n.ts.endingperiod }}</template>
			</MkInput>
			<MkButton v-if="isFilterActive" danger @click="clear"><i class="ti ti-x"></i> {{ i18n.ts.clear }}</MkButton>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkInput from '@/components/MkInput.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	initialType?: string | null;
	initialFrom?: string | null;
	initialUntil?: string | null;
}>(), {
	initialType: null,
	initialFrom: null,
	initialUntil: null,
});

const emit = defineEmits<{
	(ev: 'done', r?: { type: string | null; from: string | null; until: string | null }): void;
	(ev: 'closed'): void;
}>();

const dialog = useTemplateRef('dialog');

const typeOptions = [
	{ value: 'all', label: i18n.ts.all, icon: 'ti ti-asterisk' },
	{ value: 'image/*', label: i18n.ts.image, icon: 'ti ti-photo' },
	{ value: 'video/*', label: i18n.ts.video, icon: 'ti ti-movie' },
	{ value: 'audio/*', label: i18n.ts.audio, icon: 'ti ti-music' },
	{ value: 'other', label: i18n.ts.other, icon: 'ti ti-file' },
];

const type = ref<string>(props.initialType ?? 'all');
const from = ref<string | null>(props.initialFrom);
const until = ref<string | null>(props.initialUntil);

const isFilterActive = computed(() => type.value !== 'all' || (from.value != null && from.value !== '') || (until.value != null && until.value !== ''));

function clear() {
	type.value = 'all';
	from.value = null;
	until.value = null;
}

function ok() {
	emit('done', {
		type: type.value === 'all' ? null : type.value,
		from: from.value && from.value !== '' ? from.value : null,
		until: until.value && until.value !== '' ? until.value : null,
	});
	dialog.value?.close();
}

function cancel() {
	emit('done');
	dialog.value?.close();
}
</script>
<!-- #endregion -->

<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="dialog"
	:width="400"
	:height="500"
	:withOkButton="true"
	:okButtonText="i18n.ts._shDrawing.create"
	:okButtonDisabled="!valid"
	@close="dialog?.close()"
	@esc="dialog?.close()"
	@ok="ok"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-file-plus"></i> {{ i18n.ts._shDrawing.newCanvas }}</template>

	<div class="_spacer _gaps">
		<MkRadios v-model="sizeKey" :options="sizeOptions" vertical>
			<template #label>{{ i18n.ts._shDrawing.size }}</template>
		</MkRadios>

		<div v-if="sizeKey === 'custom'" :class="$style.customSize">
			<MkInput v-model="customWidth" type="number" :min="MIN_CANVAS_SIZE" :max="MAX_CANVAS_SIZE">
				<template #label>{{ i18n.ts._shDrawing.width }}</template>
			</MkInput>
			<MkInput v-model="customHeight" type="number" :min="MIN_CANVAS_SIZE" :max="MAX_CANVAS_SIZE">
				<template #label>{{ i18n.ts._shDrawing.height }}</template>
			</MkInput>
		</div>

		<MkRadios v-model="backgroundKey" :options="backgroundOptions">
			<template #label>{{ i18n.ts._shDrawing.background }}</template>
		</MkRadios>

		<MkColorInput v-if="backgroundKey === 'custom'" v-model="customBackground">
			<template #label>{{ i18n.ts._shDrawing._backgrounds.custom }}</template>
		</MkColorInput>

		<MkInfo warn>{{ i18n.ts._shDrawing.newCanvasDiscardsCurrent }}</MkInfo>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import type { CanvasSizePresetKey, DrawingCanvasSpec } from '@/utility/drawing/types.js';
import { CANVAS_SIZE_PRESETS, MAX_CANVAS_SIZE, MIN_CANVAS_SIZE, clampCanvasSize } from '@/utility/drawing/types.js';
import type { MkRadiosOption } from '@/components/MkRadios.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkInput from '@/components/MkInput.vue';
import MkColorInput from '@/components/MkColorInput.vue';
import MkInfo from '@/components/MkInfo.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	/** 現在のキャンバス。カスタム入力の初期値に使う */
	current: DrawingCanvasSpec;
}>();

const emit = defineEmits<{
	(ev: 'done', spec: DrawingCanvasSpec): void;
	(ev: 'closed'): void;
}>();

const dialog = useTemplateRef('dialog');

type SizeKey = CanvasSizePresetKey | 'custom';
type BackgroundKey = 'white' | 'black' | 'transparent' | 'custom';

const sizeOptions: MkRadiosOption<SizeKey>[] = [
	...CANVAS_SIZE_PRESETS.map(preset => ({
		value: preset.key,
		label: `${i18n.ts._shDrawing._sizes[preset.key]} (${preset.width}×${preset.height})`,
	})),
	{ value: 'custom', label: i18n.ts._shDrawing._sizes.custom },
];

const backgroundOptions: MkRadiosOption<BackgroundKey>[] = [
	{ value: 'white', label: i18n.ts._shDrawing._backgrounds.white },
	{ value: 'black', label: i18n.ts._shDrawing._backgrounds.black },
	{ value: 'transparent', label: i18n.ts._shDrawing._backgrounds.transparent },
	{ value: 'custom', label: i18n.ts._shDrawing._backgrounds.custom },
];

const sizeKey = ref<SizeKey>(
	CANVAS_SIZE_PRESETS.find(p => p.width === props.current.width && p.height === props.current.height)?.key ?? 'custom',
);
const customWidth = ref(props.current.width);
const customHeight = ref(props.current.height);

const backgroundKey = ref<BackgroundKey>(
	props.current.background == null ? 'transparent'
	: props.current.background === '#ffffff' ? 'white'
	: props.current.background === '#000000' ? 'black'
	: 'custom',
);
const customBackground = ref(props.current.background ?? '#ffffff');

const size = computed(() => {
	if (sizeKey.value === 'custom') {
		return { width: clampCanvasSize(Number(customWidth.value)), height: clampCanvasSize(Number(customHeight.value)) };
	}
	const preset = CANVAS_SIZE_PRESETS.find(p => p.key === sizeKey.value)!;
	return { width: preset.width, height: preset.height };
});

const background = computed<string | null>(() => {
	switch (backgroundKey.value) {
		case 'white': return '#ffffff';
		case 'black': return '#000000';
		case 'transparent': return null;
		case 'custom': return customBackground.value;
	}
});

const valid = computed(() => {
	if (sizeKey.value !== 'custom') return true;
	const w = Number(customWidth.value);
	const h = Number(customHeight.value);
	return [w, h].every(v => Number.isFinite(v) && v >= MIN_CANVAS_SIZE && v <= MAX_CANVAS_SIZE);
});

function ok() {
	if (!valid.value) return;

	emit('done', {
		width: size.value.width,
		height: size.value.height,
		background: background.value,
	});
	dialog.value?.close();
}
</script>

<style lang="scss" module>
.customSize {
	display: flex;
	gap: 12px;

	> * {
		flex: 1;
		min-width: 0;
	}
}
</style>

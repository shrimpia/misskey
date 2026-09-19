<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-tooltip="i18n.ts._shDrawing.zoom" :class="$style.range">
	<MkRange
		v-model="zoomExponent"
		:min="MIN_ZOOM_EXPONENT"
		:max="MAX_ZOOM_EXPONENT"
		:step="0.01"
		:continuousUpdate="true"
		:textConverter="zoomText"
		@thumbDoubleClicked="zoomExponent = 0"
	>
		<template #prefix>{{ i18n.ts._shDrawing.zoom }}</template>
		<template #suffix><span :class="$style.value">{{ zoomText(zoomExponent) }}</span></template>
	</MkRange>
</div>
<div v-tooltip="i18n.ts._shDrawing.rotation" :class="$style.range">
	<MkRange
		v-model="rotationDegrees"
		:min="-180"
		:max="180"
		:step="1"
		:continuousUpdate="true"
		:textConverter="rotationText"
		@thumbDoubleClicked="rotationDegrees = 0"
	>
		<template #prefix>{{ i18n.ts._shDrawing.rotation }}</template>
		<template #suffix><span :class="$style.value">{{ rotationText(rotationDegrees) }}</span></template>
	</MkRange>
</div>
<button
	v-tooltip="i18n.ts._shDrawing.resetView"
	class="_button"
	:class="$style.reset"
	:aria-label="i18n.ts._shDrawing.resetView"
	@click="emit('reset')"
>
	<i class="ti ti-focus-centered"></i>
</button>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { Point } from '@/utility/drawing/types.js';
import type { ViewportState } from '@/utility/drawing/viewport.js';
import { MAX_ZOOM, MIN_ZOOM, transformAt, zoomAt } from '@/utility/drawing/viewport.js';
import MkRange from '@/components/MkRange.vue';
import { i18n } from '@/i18n.js';

const view = defineModel<ViewportState>('view', { required: true });

const emit = defineEmits<{
	(ev: 'reset'): void;
}>();

/** バーからの操作は、画面中央にあるものを動かさずに倍率と角度を変える */
const VIEW_ANCHOR: Point = { x: 0, y: 0 };

// 倍率はスライダー上では 2 の冪で扱う (等倍がつまみの中央付近に来るように)
const MIN_ZOOM_EXPONENT = Math.log2(MIN_ZOOM);
const MAX_ZOOM_EXPONENT = Math.log2(MAX_ZOOM);

const zoomExponent = computed<number>({
	get: () => Math.log2(view.value.zoom),
	set: (value) => {
		view.value = zoomAt(view.value, 2 ** value, VIEW_ANCHOR);
	},
});

const rotationDegrees = computed<number>({
	get: () => Math.round(view.value.rotation * 180 / Math.PI),
	set: (value) => {
		view.value = transformAt(view.value, view.value.zoom, value * Math.PI / 180 - view.value.rotation, VIEW_ANCHOR);
	},
});

function zoomText(exponent: number): string {
	return `${Math.round(2 ** exponent * 100)}%`;
}

function rotationText(degrees: number): string {
	return `${degrees}°`;
}
</script>

<style lang="scss" module>
// バーの flex 配置にそのまま乗せたいので、ラッパー要素は挟まない (テンプレートは複数ルート)
.range {
	flex: 1 1 auto;
	width: 220px;
	min-width: 120px;
}

// 値が変わっても幅が動かないよう、桁数ぶんの幅を確保しておく
.value {
	min-width: 3.5em;
	font-size: 0.9em;
	text-align: right;
	font-variant-numeric: tabular-nums;
	opacity: 0.8;
}

.reset {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	border-radius: 8px;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}
</style>

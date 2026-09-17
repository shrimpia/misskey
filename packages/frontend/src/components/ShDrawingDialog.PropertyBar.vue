<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="hasProperties" class="_acrylic" :class="$style.root" role="group" :aria-label="i18n.ts._shDrawing.propertyBar">
	<template v-if="tool === 'pen' || tool === 'eraser'">
		<div v-tooltip="i18n.ts._shDrawing.thickness" :class="$style.range">
			<MkRange v-if="tool === 'pen'" v-model="penWidth" :min="1" :max="64" :step="1" :continuousUpdate="true">
				<template #prefix><i class="ti ti-line-height" :class="$style.rangeIcon"></i></template>
			</MkRange>
			<MkRange v-else v-model="eraserWidth" :min="1" :max="64" :step="1" :continuousUpdate="true">
				<template #prefix><i class="ti ti-line-height" :class="$style.rangeIcon"></i></template>
			</MkRange>
		</div>
		<XColorButton v-if="tool === 'pen'" v-model="penColor" :label="i18n.ts._shDrawing.color"/>
	</template>

	<template v-else-if="tool === 'fill'">
		<XColorButton v-model="penColor" :label="i18n.ts._shDrawing.color"/>
	</template>

	<template v-else-if="tool === 'shape'">
		<button
			v-tooltip="i18n.ts._shDrawing.shapeKind"
			class="_button"
			:class="$style.dropdown"
			:aria-label="`${i18n.ts._shDrawing.shapeKind}: ${currentShapeKind.label}`"
			aria-haspopup="menu"
			@click="showShapeKindMenu"
		>
			<i :class="currentShapeKind.icon"></i>
			<span>{{ currentShapeKind.label }}</span>
			<i class="ti ti-chevron-down" :class="$style.dropdownChevron"></i>
		</button>
		<div v-if="shapeKind !== 'line'" :class="$style.segment" role="group" :aria-label="i18n.ts._shDrawing.mode">
			<button
				v-for="item in shapeModeItems"
				:key="item.value"
				v-tooltip="item.label"
				class="_button"
				:class="[$style.segmentButton, { [$style.active]: shapeMode === item.value }]"
				:aria-pressed="shapeMode === item.value"
				:aria-label="item.label"
				@click="shapeMode = item.value"
			>
				<span
					:class="$style.modePreview"
					:style="{
						borderColor: item.value === 'fill' ? 'transparent' : shapeStrokeColor,
						background: item.value === 'stroke' ? 'transparent' : shapeFillColor,
					}"
				></span>
			</button>
		</div>
		<div v-if="showShapeStroke" v-tooltip="i18n.ts._shDrawing.thickness" :class="$style.range">
			<MkRange v-model="shapeWidth" :min="1" :max="64" :step="1" :continuousUpdate="true">
				<template #prefix><i class="ti ti-line-height" :class="$style.rangeIcon"></i></template>
			</MkRange>
		</div>
		<XColorButton v-if="showShapeStroke" v-model="shapeStrokeColor" :label="i18n.ts._shDrawing.strokeColor"/>
		<XColorButton v-if="showShapeFill" v-model="shapeFillColor" :label="i18n.ts._shDrawing.fillColor"/>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import XColorButton from './ShDrawingDialog.ColorButton.vue';
import type { DrawingSettings, DrawingToolKind, ShapeFillMode, ShapeKind } from '@/utility/drawing/types.js';
import MkRange from '@/components/MkRange.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const settings = defineModel<DrawingSettings>('settings', { required: true });

const props = defineProps<{
	tool: DrawingToolKind;
}>();

/** settings の 1 項目を v-model で扱えるようにする */
function useSetting<K extends keyof DrawingSettings>(key: K) {
	return computed<DrawingSettings[K]>({
		get: () => settings.value[key],
		set: (value) => {
			settings.value = { ...settings.value, [key]: value };
		},
	});
}

const penWidth = useSetting('penWidth');
const penColor = useSetting('penColor');
const eraserWidth = useSetting('eraserWidth');
const shapeKind = useSetting('shapeKind');
const shapeMode = useSetting('shapeMode');
const shapeWidth = useSetting('shapeWidth');
const shapeStrokeColor = useSetting('shapeStrokeColor');
const shapeFillColor = useSetting('shapeFillColor');

const hasProperties = computed(() => props.tool !== 'hand' && props.tool !== 'eyedropper');

// 直線は面を持たないため、モードに関わらず線の設定のみ出す
const showShapeStroke = computed(() => shapeKind.value === 'line' || shapeMode.value !== 'fill');
const showShapeFill = computed(() => shapeKind.value !== 'line' && shapeMode.value !== 'stroke');

const shapeKindItems: { value: ShapeKind; label: string; icon: string; }[] = [
	{ value: 'rect', label: i18n.ts._shDrawing._shapes.rect, icon: 'ti ti-square' },
	{ value: 'ellipse', label: i18n.ts._shDrawing._shapes.ellipse, icon: 'ti ti-oval' },
	{ value: 'line', label: i18n.ts._shDrawing._shapes.line, icon: 'ti ti-line' },
];

const currentShapeKind = computed(() => shapeKindItems.find(item => item.value === shapeKind.value) ?? shapeKindItems[0]);

function showShapeKindMenu(ev: MouseEvent) {
	os.popupMenu(shapeKindItems.map(item => ({
		text: item.label,
		icon: item.icon,
		active: shapeKind.value === item.value,
		action: () => {
			shapeKind.value = item.value;
		},
	})), ev.currentTarget ?? ev.target);
}

const shapeModeItems: { value: ShapeFillMode; label: string; }[] = [
	{ value: 'stroke', label: i18n.ts._shDrawing._modes.stroke },
	{ value: 'fill', label: i18n.ts._shDrawing._modes.fill },
	{ value: 'strokeAndFill', label: i18n.ts._shDrawing._modes.strokeAndFill },
];
</script>

<style lang="scss" module>
.root {
	position: absolute;
	top: 12px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: 6px;
	height: 44px;
	padding: 0 8px;
	max-width: calc(100% - 24px);
	overflow-x: auto;
	overflow-y: hidden;
	box-sizing: border-box;
	border-radius: 12px;
	box-shadow: 0 4px 24px var(--MI_THEME-shadow);
	white-space: nowrap;
}

.range {
	flex-shrink: 0;
	width: 140px;

	@container (max-width: 500px) {
		width: 110px;
	}
}

.rangeIcon {
	opacity: 0.7;
}

.dropdown {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	gap: 6px;
	height: 32px;
	padding: 0 10px;
	border-radius: 8px;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.dropdownChevron {
	font-size: 0.8em;
	opacity: 0.7;
}

.segment {
	display: flex;
	flex-shrink: 0;
	gap: 2px;
}

.segmentButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 8px;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&.active {
		background: var(--MI_THEME-accentedBg);
	}
}

.modePreview {
	width: 16px;
	height: 16px;
	border: solid 3px;
	border-radius: 3px;
	box-sizing: border-box;
}
</style>

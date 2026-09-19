<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="hasProperties" class="_acrylic" :class="$style.root" role="group" :aria-label="i18n.ts._shDrawing.propertyBar">
	<template v-if="tool === 'hand'">
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
				<template #suffix><span :class="$style.rangeValue">{{ zoomText(zoomExponent) }}</span></template>
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
				<template #suffix><span :class="$style.rangeValue">{{ rotationText(rotationDegrees) }}</span></template>
			</MkRange>
		</div>
		<button
			v-tooltip="i18n.ts._shDrawing.resetView"
			class="_button"
			:class="$style.iconButton"
			:aria-label="i18n.ts._shDrawing.resetView"
			@click="emit('resetView')"
		>
			<i class="ti ti-focus-centered"></i>
		</button>
	</template>

	<template v-else-if="tool === 'pen' || tool === 'eraser'">
		<div v-tooltip="i18n.ts._shDrawing.thickness" :class="$style.range">
			<MkRange v-if="tool === 'pen'" v-model="penWidth" :min="1" :max="64" :step="1" :continuousUpdate="true">
				<template #prefix>{{ i18n.ts._shDrawing.thickness }}</template>
			</MkRange>
			<MkRange v-else v-model="eraserWidth" :min="1" :max="64" :step="1" :continuousUpdate="true">
				<template #prefix>{{ i18n.ts._shDrawing.thickness }}</template>
			</MkRange>
		</div>
		<XColorButton v-if="tool === 'pen'" v-model="penColor" :label="i18n.ts._shDrawing.color"/>
		<button
			class="_button"
			:class="[$style.toggle, { [$style.active]: pressureSensitivity }]"
			:aria-pressed="pressureSensitivity"
			@click="pressureSensitivity = !pressureSensitivity"
		>
			<i class="ti ti-brush"></i>
			<span>{{ i18n.ts._shDrawing.pressure }}</span>
		</button>
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
import type { DrawingSettings, DrawingToolKind, Point, ShapeFillMode, ShapeKind } from '@/utility/drawing/types.js';
import type { ViewportState } from '@/utility/drawing/viewport.js';
import { MAX_ZOOM, MIN_ZOOM, transformAt, zoomAt } from '@/utility/drawing/viewport.js';
import MkRange from '@/components/MkRange.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const settings = defineModel<DrawingSettings>('settings', { required: true });
const view = defineModel<ViewportState>('view', { required: true });

const props = defineProps<{
	tool: DrawingToolKind;
}>();

const emit = defineEmits<{
	(ev: 'resetView'): void;
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
const pressureSensitivity = useSetting('pressureSensitivity');

const hasProperties = computed(() => props.tool !== 'eyedropper');

// #region 表示 (ハンドツール)
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
// #endregion

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

	// 画面が狭いときはバーを横いっぱいに広げて、トラックバーに幅を回す
	@container (max-width: 500px) {
		width: calc(100% - 24px);
	}
}

.range {
	flex: 1 1 auto;
	width: 220px;
	min-width: 120px;
}

.rangeIcon {
	opacity: 0.7;
}

// 値が変わっても幅が動かないよう、桁数ぶんの幅を確保しておく
.rangeValue {
	min-width: 3.5em;
	font-size: 0.9em;
	text-align: right;
	font-variant-numeric: tabular-nums;
	opacity: 0.8;
}

// バーの高さ (44px) に収めるため、文字を詰める
.toggle {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	gap: 4px;
	height: 32px;
	padding: 0 10px;
	border-radius: 8px;
	font-size: 0.9em;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&.active {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
	}
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

%iconButton {
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

.iconButton {
	@extend %iconButton;
}

.segmentButton {
	@extend %iconButton;

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

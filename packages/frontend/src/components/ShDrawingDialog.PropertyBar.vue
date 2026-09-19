<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="properties.length > 0" class="_acrylic" :class="$style.root" role="group" :aria-label="i18n.ts._shDrawing.propertyBar">
	<template v-for="property in properties" :key="keyOf(property)">
		<button
			v-if="property.type === 'number'"
			class="_button"
			:class="$style.dropdown"
			:disabled="!isEnabled(property)"
			:aria-label="`${labelOf(property.label)}: ${settings[property.key]}`"
			aria-haspopup="dialog"
			@click="showNumberPopup(property, $event)"
		>
			<span>{{ labelOf(property.label) }}</span>
			<span :class="$style.numberValue">{{ settings[property.key] }}</span>
		</button>

		<XColorButton
			v-else-if="property.type === 'color'"
			:modelValue="settings[property.key]"
			:label="labelOf(property.label)"
			:disabled="!isEnabled(property)"
			@update:modelValue="value => updateSetting(property.key, value)"
		/>

		<button
			v-else-if="property.type === 'boolean'"
			class="_button"
			:class="[$style.toggle, { [$style.active]: settings[property.key] }]"
			:disabled="!isEnabled(property)"
			:aria-pressed="settings[property.key]"
			@click="updateSetting(property.key, !settings[property.key])"
		>
			<i :class="property.icon"></i>
			<span>{{ labelOf(property.label) }}</span>
		</button>

		<button
			v-else-if="property.type === 'enum'"
			v-tooltip="labelOf(property.label)"
			class="_button"
			:class="$style.dropdown"
			:disabled="!isEnabled(property)"
			:aria-label="`${labelOf(property.label)}: ${labelOf(currentItem(property).label)}`"
			aria-haspopup="menu"
			@click="showEnumMenu(property, $event)"
		>
			<i :class="currentItem(property).icon"></i>
		</button>

		<XViewControls v-else v-model:view="view" @reset="emit('resetView')"/>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import XColorButton from './ShDrawingDialog.ColorButton.vue';
import XNumberPopup from './ShDrawingDialog.PropertyBar.NumberPopup.vue';
import XViewControls from './ShDrawingDialog.PropertyBar.ViewControls.vue';
import type { DrawingSettings, DrawingToolKind } from '@/utility/drawing/types.js';
import type { DrawingToolProperty } from '@/utility/drawing/tools.js';
import type { ViewportState } from '@/utility/drawing/viewport.js';
import { TOOL_PROPERTIES } from '@/utility/drawing/tools.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

type NumberProperty = Extract<DrawingToolProperty, { type: 'number'; }>;
type EnumProperty = Extract<DrawingToolProperty, { type: 'enum'; }>;

const settings = defineModel<DrawingSettings>('settings', { required: true });
const view = defineModel<ViewportState>('view', { required: true });

const props = defineProps<{
	tool: DrawingToolKind;
}>();

const emit = defineEmits<{
	(ev: 'resetView'): void;
}>();

/** 定義が持つ内部名に文言を当てる。文言を知っているのは UI 側だけ */
const LABELS: Record<string, string> = {
	thickness: i18n.ts._shDrawing.thickness,
	color: i18n.ts._shDrawing.color,
	pressure: i18n.ts._shDrawing.pressure,
	shapeKind: i18n.ts._shDrawing.shapeKind,
	mode: i18n.ts._shDrawing.mode,
	strokeColor: i18n.ts._shDrawing.strokeColor,
	fillColor: i18n.ts._shDrawing.fillColor,
	rect: i18n.ts._shDrawing._shapes.rect,
	ellipse: i18n.ts._shDrawing._shapes.ellipse,
	line: i18n.ts._shDrawing._shapes.line,
	stroke: i18n.ts._shDrawing._modes.stroke,
	fill: i18n.ts._shDrawing._modes.fill,
	strokeAndFill: i18n.ts._shDrawing._modes.strokeAndFill,
};

/** 対応表に無いときは内部名をそのまま出す (undefined を画面に出さないため) */
function labelOf(name: string): string {
	return LABELS[name] ?? name;
}

const properties = computed(() => TOOL_PROPERTIES[props.tool].filter(property => property.visible?.(settings.value) ?? true));

/** 項目の出入りで DOM が使い回されないように、項目ごとに決まる名前を振る */
function keyOf(property: DrawingToolProperty): string {
	return property.type === 'view' ? property.type : `${property.type}:${property.key}`;
}

function isEnabled(property: DrawingToolProperty): boolean {
	return property.enabled?.(settings.value) ?? true;
}

function updateSetting(key: keyof DrawingSettings, value: unknown) {
	// 書き戻す先は定義から来るため、キーと値の組み合わせは型で保証しきれない
	settings.value = { ...settings.value, [key]: value } as DrawingSettings;
}

function showNumberPopup(property: NumberProperty, ev: MouseEvent) {
	const { dispose } = os.popup(XNumberPopup, {
		anchorElement: ev.currentTarget as HTMLElement,
		label: labelOf(property.label),
		modelValue: settings.value[property.key],
		min: property.min,
		max: property.max,
		step: property.step,
	}, {
		'update:modelValue': (value: number) => {
			updateSetting(property.key, value);
		},
		closed: () => dispose(),
	});
}

function currentItem(property: EnumProperty) {
	return property.items.find(item => item.value === settings.value[property.key]) ?? property.items[0];
}

function showEnumMenu(property: EnumProperty, ev: MouseEvent) {
	os.popupMenu(property.items.map(item => ({
		text: labelOf(item.label),
		icon: item.icon,
		active: settings.value[property.key] === item.value,
		action: () => {
			updateSetting(property.key, item.value);
		},
	})), ev.currentTarget ?? ev.target);
}
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

	&:disabled {
		opacity: 0.5;
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

	&:disabled {
		opacity: 0.5;
	}
}

// 値が変わっても幅が動かないよう、桁数ぶんの幅を確保しておく
.numberValue {
	min-width: 2em;
	text-align: right;
	font-variant-numeric: tabular-nums;
	opacity: 0.8;
}

.dropdownChevron {
	font-size: 0.8em;
	opacity: 0.7;
}
</style>

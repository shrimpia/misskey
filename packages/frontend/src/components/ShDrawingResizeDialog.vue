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
	:okButtonText="i18n.ts.apply"
	:okButtonDisabled="!valid"
	@close="dialog?.close()"
	@esc="dialog?.close()"
	@ok="ok"
	@closed="emit('closed')"
>
	<template #header>
		<i :class="mode === 'canvas' ? 'ti ti-crop' : 'ti ti-arrows-diagonal'"></i>
		{{ mode === 'canvas' ? i18n.ts._shDrawing.resizeCanvas : i18n.ts._shDrawing.resizeImage }}
	</template>

	<div class="_spacer _gaps">
		<div :class="$style.size">
			<MkInput v-model="width" type="number" :min="MIN_CANVAS_SIZE" :max="MAX_CANVAS_SIZE" @update:modelValue="onWidthInput">
				<template #label>{{ i18n.ts._shDrawing.width }}</template>
			</MkInput>
			<MkInput v-model="height" type="number" :min="MIN_CANVAS_SIZE" :max="MAX_CANVAS_SIZE" @update:modelValue="onHeightInput">
				<template #label>{{ i18n.ts._shDrawing.height }}</template>
			</MkInput>
		</div>

		<template v-if="mode === 'image'">
			<MkSwitch v-model="keepAspectRatio">
				<template #label>{{ i18n.ts._shDrawing.keepAspectRatio }}</template>
			</MkSwitch>

			<MkSwitch v-model="smooth">
				<template #label>{{ i18n.ts._shDrawing.smoothResize }}</template>
			</MkSwitch>
		</template>

		<div v-else>
			<div :class="$style.anchorLabel">{{ i18n.ts._shDrawing.anchor }}</div>
			<div :class="$style.anchorGrid" role="group" :aria-label="i18n.ts._shDrawing.anchor">
				<button
					v-for="point in ANCHOR_POINTS"
					:key="point"
					v-tooltip="i18n.ts._shDrawing._anchors[point]"
					class="_button"
					:class="[$style.anchorButton, { [$style.anchorActive]: anchor === point }]"
					:aria-label="i18n.ts._shDrawing._anchors[point]"
					:aria-pressed="anchor === point"
					@click="anchor = point"
				>
					<i :class="anchorIcons[point]"></i>
				</button>
			</div>
		</div>

		<MkInfo>{{ mode === 'canvas' ? i18n.ts._shDrawing.resizeCanvasInfo : i18n.ts._shDrawing.resizeImageInfo }} {{ i18n.ts._shDrawing.resizeResetsHistory }}</MkInfo>
	</div>
</MkModalWindow>
</template>

<script lang="ts">
export type DrawingResizeResult = {
	width: number;
	height: number;
	anchor: AnchorPoint;
	smooth: boolean;
};
</script>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import type { AnchorPoint } from '@/utility/drawing/resize.js';
import type { DrawingCanvasSpec } from '@/utility/drawing/types.js';
import { ANCHOR_POINTS } from '@/utility/drawing/resize.js';
import { MAX_CANVAS_SIZE, MIN_CANVAS_SIZE, clampCanvasSize } from '@/utility/drawing/types.js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInfo from '@/components/MkInfo.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	/** canvas: 拡縮せず切り抜き / 余白 、image: 再サンプリング */
	mode: 'canvas' | 'image';
	current: DrawingCanvasSpec;
}>();

const emit = defineEmits<{
	(ev: 'done', result: DrawingResizeResult): void;
	(ev: 'closed'): void;
}>();

const dialog = useTemplateRef('dialog');

const width = ref(props.current.width);
const height = ref(props.current.height);
const anchor = ref<AnchorPoint>('center');
const keepAspectRatio = ref(true);
const smooth = ref(true);

const aspectRatio = props.current.width / props.current.height;

const anchorIcons: Record<AnchorPoint, string> = {
	topLeft: 'ti ti-arrow-up-left',
	top: 'ti ti-arrow-up',
	topRight: 'ti ti-arrow-up-right',
	left: 'ti ti-arrow-left',
	center: 'ti ti-focus-centered',
	right: 'ti ti-arrow-right',
	bottomLeft: 'ti ti-arrow-down-left',
	bottom: 'ti ti-arrow-down',
	bottomRight: 'ti ti-arrow-down-right',
};

function isValidSize(value: number): boolean {
	return Number.isFinite(value) && value >= MIN_CANVAS_SIZE && value <= MAX_CANVAS_SIZE;
}

const valid = computed(() => isValidSize(Number(width.value)) && isValidSize(Number(height.value)));

function onWidthInput(value: string | number) {
	if (props.mode !== 'image' || !keepAspectRatio.value) return;
	const w = Number(value);
	if (!isValidSize(w)) return;
	height.value = clampCanvasSize(w / aspectRatio);
}

function onHeightInput(value: string | number) {
	if (props.mode !== 'image' || !keepAspectRatio.value) return;
	const h = Number(value);
	if (!isValidSize(h)) return;
	width.value = clampCanvasSize(h * aspectRatio);
}

function ok() {
	if (!valid.value) return;

	emit('done', {
		width: clampCanvasSize(Number(width.value)),
		height: clampCanvasSize(Number(height.value)),
		anchor: anchor.value,
		smooth: smooth.value,
	});
	dialog.value?.close();
}
</script>

<style lang="scss" module>
.size {
	display: flex;
	gap: 12px;

	> * {
		flex: 1;
		min-width: 0;
	}
}

.anchorLabel {
	font-size: 0.85em;
	padding: 0 0 8px 0;
	user-select: none;
}

.anchorGrid {
	display: grid;
	grid-template-columns: repeat(3, 40px);
	grid-template-rows: repeat(3, 40px);
	gap: 4px;
}

.anchorButton {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	background: var(--MI_THEME-panel);

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.anchorActive {
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}
</style>

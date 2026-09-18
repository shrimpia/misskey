<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_acrylic" :class="$style.root" role="group" :aria-label="i18n.ts._shDrawing.toolbar">
	<div :class="$style.tools">
		<button
			v-for="item in tools"
			:key="item.kind"
			v-tooltip="item.label"
			class="_button"
			:class="[$style.button, { [$style.active]: tool === item.kind }]"
			:aria-label="item.label"
			:aria-pressed="tool === item.kind"
			@click="tool = item.kind"
		>
			<i :class="item.icon"></i>
		</button>
	</div>

	<div :class="$style.divider"></div>

	<!-- ツールが増えてもここは流れないよう、操作系は端に固定する -->
	<div :class="$style.actions">
		<button
			v-tooltip="i18n.ts._shDrawing.undo"
			class="_button"
			:class="$style.button"
			:disabled="!canUndo"
			:aria-label="i18n.ts._shDrawing.undo"
			@click="emit('undo')"
		>
			<i class="ti ti-arrow-back-up"></i>
		</button>
		<button
			v-tooltip="i18n.ts._shDrawing.redo"
			class="_button"
			:class="$style.button"
			:disabled="!canRedo"
			:aria-label="i18n.ts._shDrawing.redo"
			@click="emit('redo')"
		>
			<i class="ti ti-arrow-forward-up"></i>
		</button>
		<button
			v-tooltip="i18n.ts.menu"
			class="_button"
			:class="$style.button"
			:aria-label="i18n.ts.menu"
			aria-haspopup="menu"
			@click="emit('menu', $event)"
		>
			<i class="ti ti-dots"></i>
		</button>
	</div>
</div>
</template>

<script lang="ts" setup>
import type { DrawingToolKind } from '@/utility/drawing/types.js';
import { i18n } from '@/i18n.js';

const tool = defineModel<DrawingToolKind>('tool', { required: true });

defineProps<{
	canUndo: boolean;
	canRedo: boolean;
}>();

const emit = defineEmits<{
	(ev: 'undo'): void;
	(ev: 'redo'): void;
	(ev: 'menu', payload: MouseEvent): void;
}>();

const tools: { kind: DrawingToolKind; icon: string; label: string; }[] = [
	{ kind: 'hand', icon: 'ti ti-hand-stop', label: i18n.ts._shDrawing._tools.hand },
	{ kind: 'pen', icon: 'ti ti-pencil', label: i18n.ts._shDrawing._tools.pen },
	{ kind: 'eraser', icon: 'ti ti-eraser', label: i18n.ts._shDrawing._tools.eraser },
	{ kind: 'fill', icon: 'ti ti-paint', label: i18n.ts._shDrawing._tools.fill },
	{ kind: 'shape', icon: 'ti ti-shape', label: i18n.ts._shDrawing._tools.shape },
	{ kind: 'eyedropper', icon: 'ti ti-color-picker', label: i18n.ts._shDrawing._tools.eyedropper },
];
</script>

<style lang="scss" module>
.root {
	position: absolute;
	top: 50%;
	right: 12px;
	transform: translateY(-50%);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	padding: 6px;
	max-height: calc(100% - 24px);
	box-sizing: border-box;
	border-radius: 16px;
	box-shadow: 0 4px 24px var(--MI_THEME-shadow);

	@container (max-width: 500px) {
		top: auto;
		right: auto;
		bottom: 12px;
		left: 50%;
		transform: translateX(-50%);
		flex-direction: row;
		max-height: none;
		max-width: calc(100% - 24px);
	}
}

// ツール選択はここだけが流れる
.tools {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	min-height: 0;
	overflow-y: auto;
	overflow-x: hidden;
	scrollbar-width: none;

	&::-webkit-scrollbar {
		display: none;
	}

	@container (max-width: 500px) {
		flex-direction: row;
		min-height: auto;
		min-width: 0;
		overflow-x: auto;
		overflow-y: hidden;
	}
}

.actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	flex-shrink: 0;

	@container (max-width: 500px) {
		flex-direction: row;
	}
}

.button {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 44px;
	height: 44px;
	border-radius: 12px;
	font-size: 1.2em;

	&:hover:not(:disabled) {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&:disabled {
		opacity: 0.4;
	}

	&.active {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
	}

	@container (max-width: 500px) {
		width: 40px;
		height: 40px;
	}
}

.divider {
	flex-shrink: 0;
	width: 70%;
	height: 1px;
	margin: 2px 0;
	background: var(--MI_THEME-divider);

	@container (max-width: 500px) {
		width: 1px;
		height: 28px;
		margin: 0 2px;
	}
}
</style>

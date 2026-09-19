<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<label v-tooltip="label" :class="['_button', $style.root]">
	{{ label }}
	<span :class="$style.swatch" :style="{ background: model }"></span>
	<input v-model="model" type="color" :class="$style.input" :aria-label="label">
</label>
</template>

<script lang="ts" setup>
const model = defineModel<string>({ required: true });

defineProps<{
	label: string;
}>();
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	gap: 4px;
	height: 32px;
	padding: 0 10px;
	border-radius: 8px;
	font-size: 0.9em;
	cursor: pointer;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&:focus-within {
		outline: 2px solid var(--MI_THEME-focus);
		outline-offset: -2px;
	}
}

.swatch {
	width: 20px;
	height: 20px;
	border-radius: 999px;
	border: solid 2px var(--MI_THEME-divider);
	box-sizing: border-box;
}

.input {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	cursor: pointer;
}
</style>

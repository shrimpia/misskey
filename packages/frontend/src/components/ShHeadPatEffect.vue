<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<!-- #region shrimpia なでなで機能 -->
<template>
<div
	:class="$style.root"
	:style="{
		zIndex,
		top: `${y - size * 0.4}px`,
		left: `${x - size * 0.4}px`,
		width: `${size}px`,
		height: `${size}px`,
	}"
>
	<img :class="$style.hand" :src="HAND_IMAGE_URL" alt="" draggable="false"/>
</div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import * as os from '@/os.js';

const HAND_IMAGE_URL = 'https://media.shrimpia.network/mk-shrimpia/files/fa5e68fc-1e89-4017-9522-4a5e7a25f946';

defineProps<{
	x: number;
	y: number;
	size: number;
}>();

const emit = defineEmits<{
	(ev: 'end'): void;
}>();

const zIndex = os.claimZIndex('high');

onMounted(() => {
	window.setTimeout(() => {
		emit('end');
	}, 300);
});
</script>

<style lang="scss" module>
.root {
	pointer-events: none;
	user-select: none;
	position: fixed;
}

.hand {
	display: block;
	width: 100%;
	height: 100%;
}
</style>
<!-- #endregion -->

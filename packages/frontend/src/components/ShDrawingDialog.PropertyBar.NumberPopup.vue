<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal
	ref="modal"
	v-slot="{ type }"
	:anchorElement="anchorElement"
	:returnFocusTo="anchorElement"
	:zPriority="'high'"
	:transparentBg="true"
	@click="modal?.close()"
	@esc="modal?.close()"
	@closed="emit('closed')"
>
	<div class="_popup _shadow" :class="[$style.root, { [$style.drawer]: type === 'drawer' }]">
		<MkInput
			:modelValue="value"
			type="number"
			:min="min"
			:max="max"
			:step="step"
			:class="[$style.input]"
			@update:modelValue="apply"
			@enter="modal?.close()"
		>
		</MkInput>
		<MkRange
			:modelValue="value"
			:min="min"
			:max="max"
			:step="step"
			:continuousUpdate="true"
			:class="[$style.range]"
			@update:modelValue="apply"
		/>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import MkModal from '@/components/MkModal.vue';
import MkInput from '@/components/MkInput.vue';
import MkRange from '@/components/MkRange.vue';

const props = defineProps<{
	anchorElement: HTMLElement | null;
	label: string;
	modelValue: number;
	min: number;
	max: number;
	step: number;
}>();

const emit = defineEmits<{
	(ev: 'update:modelValue', value: number): void;
	(ev: 'closed'): void;
}>();

const modal = useTemplateRef('modal');

/** 開いている間の値はこちらが持つ (ポップアップへ渡した props は後から変わらないため) */
const value = ref(props.modelValue);

/**
 * 範囲外の値は無視する。
 *
 * 数値入力は打っている途中の値も飛んでくるので、丸めて押し返すと入力が邪魔される
 * (例: 下限 1 のときに 12 と打とうとすると、1 文字目で 1 に固定されてしまう)
 */
function apply(next: number) {
	if (!Number.isFinite(next) || next < props.min || next > props.max) return;
	value.value = next;
	emit('update:modelValue', next);
}
</script>

<style lang="scss" module>
.root {
	display: flex;
	gap: 12px;
	width: 320px;
	padding: 8px;
	box-sizing: border-box;
}

.range {
	flex: 1;
}

.drawer {
	width: 100%;
	border-radius: 24px 24px 0 0;
}
</style>

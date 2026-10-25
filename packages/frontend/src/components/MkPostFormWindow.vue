<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<MkWindow ref="window"
		:initial-width="520"
		:initial-height="274"
		:can-resize="true"
		:mini="true"
		:front="true"
		@closed="emit('closed')">
	<MkPostForm ref="form" fixed style="margin: 0" v-bind="props" autofocus/>
</MkWindow>
</template>

<script lang="ts" setup>
import { } from 'vue';
import * as misskey from 'misskey-js';
import MkWindow from '@/components/MkWindow.vue';
import MkPostForm from '@/components/MkPostForm.vue';

const props = defineProps<{
	reply?: misskey.entities.Note;
	renote?: misskey.entities.Note;
	channel?: any; // TODO
	mention?: misskey.entities.User;
	specified?: misskey.entities.User;
	initialText?: string;
	initialVisibility?: typeof misskey.noteVisibilities;
	initialFiles?: misskey.entities.DriveFile[];
	initialLocalOnly?: boolean;
	initialVisibleUsers?: misskey.entities.User[];
	initialNote?: misskey.entities.Note;
	instant?: boolean;
	autofocus?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

let form = $shallowRef<InstanceType<typeof MkPostForm>>();
</script>

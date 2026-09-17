<!--
SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="dialog"
	:width="800"
	:height="700"
	:withOkButton="true"
	:okButtonText="i18n.ts.save"
	:okButtonDisabled="!ready || saving"
	@close="tryClose"
	@esc="tryClose"
	@ok="save"
	@closed="emit('closed')"
>
	<template #header><i class="ti ti-brush"></i> {{ i18n.ts._shDrawing.title }}</template>

	<div v-hotkey.global="keymap" :class="$style.root">
		<XViewport
			ref="viewport"
			:tool="tool"
			:settings="settings"
			@ready="onReady"
			@commit="onCommit"
			@pickColor="onPickColor"
		/>
		<XPropertyBar v-model:settings="settings" :tool="tool"/>
		<XToolbar
			v-model:tool="tool"
			:canUndo="canUndo"
			:canRedo="canRedo"
			@undo="undo"
			@redo="redo"
		/>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, markRaw, ref, useTemplateRef, watch } from 'vue';
import * as Misskey from 'misskey-js';
import XViewport from './ShDrawingDialog.Viewport.vue';
import XToolbar from './ShDrawingDialog.Toolbar.vue';
import XPropertyBar from './ShDrawingDialog.PropertyBar.vue';
import type { DrawingToolKind } from '@/utility/drawing/types.js';
import type { Keymap } from '@/utility/hotkey.js';
import { createDefaultDrawingSettings } from '@/utility/drawing/types.js';
import { DrawingHistory } from '@/utility/drawing/history.js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import { useBeforeUnloadGuard } from '@/composables/use-before-unload-guard.js';
import { uploadFile } from '@/utility/drive.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const props = defineProps<{
	/** アップロード先のドライブフォルダ */
	folderId?: string | null;
}>();

const emit = defineEmits<{
	(ev: 'saved', file: Misskey.entities.DriveFile): void;
	(ev: 'closed'): void;
}>();

const dialog = useTemplateRef('dialog');
const viewport = useTemplateRef('viewport');

const tool = ref<DrawingToolKind>('pen');
const settings = ref(createDefaultDrawingSettings());

const history = markRaw(new DrawingHistory<ImageData>());
// DrawingHistory 自体はリアクティブではないため、変更のたびに更新して算出プロパティを再評価させる
const historyVersion = ref(0);
const canUndo = computed(() => historyVersion.value >= 0 && history.canUndo);
const canRedo = computed(() => historyVersion.value >= 0 && history.canRedo);
const isDirty = computed(() => historyVersion.value >= 0 && history.isDirty);

const ready = ref(false);
const saving = ref(false);
/** 閉じる確認ダイアログの多重表示防止 */
let confirmingClose = false;

useBeforeUnloadGuard(isDirty);

/** スポイト使用前のツール (色取得後に戻す) */
let toolBeforeEyedropper: DrawingToolKind = 'pen';
watch(tool, (_, prev) => {
	if (prev !== 'eyedropper') toolBeforeEyedropper = prev;
});

function onReady(snapshot: ImageData) {
	history.reset(snapshot);
	historyVersion.value++;
	ready.value = true;
}

function onCommit(snapshot: ImageData) {
	history.push(snapshot);
	historyVersion.value++;
}

function onPickColor(hex: string) {
	settings.value = {
		...settings.value,
		penColor: hex,
		shapeStrokeColor: hex,
	};
	tool.value = toolBeforeEyedropper === 'hand' ? 'pen' : toolBeforeEyedropper;
}

function undo() {
	const snapshot = history.undo();
	if (snapshot == null) return;
	viewport.value?.restore(snapshot);
	historyVersion.value++;
}

function redo() {
	const snapshot = history.redo();
	if (snapshot == null) return;
	viewport.value?.restore(snapshot);
	historyVersion.value++;
}

const keymap = {
	'ctrl+z': {
		allowRepeat: true,
		callback: () => undo(),
	},
	'ctrl+shift+z|ctrl+y': {
		allowRepeat: true,
		callback: () => redo(),
	},
} as const satisfies Keymap;

async function tryClose() {
	if (saving.value || confirmingClose) return;

	if (isDirty.value) {
		confirmingClose = true;
		try {
			const { canceled } = await os.confirm({
				type: 'warning',
				text: i18n.ts.leaveConfirm,
			});
			if (canceled) return;
		} finally {
			confirmingClose = false;
		}
	}

	dialog.value?.close();
}

function formatFileName(date: Date): string {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `drawing-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.png`;
}

async function save() {
	if (viewport.value == null || !ready.value || saving.value) return;

	saving.value = true;
	const done = os.waiting();
	try {
		const blob = await viewport.value.toBlob();
		const { filePromise } = uploadFile(blob, {
			name: formatFileName(new Date()),
			folderId: props.folderId ?? null,
		});
		const file = await filePromise;

		history.markSaved();
		historyVersion.value++;
		done({ success: true });
		emit('saved', file);
		dialog.value?.close();
	} catch (err) {
		// アップロード失敗時のエラー表示は uploadFile 側で行われる
		console.error(err);
		done();
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="scss" module>
.root {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}
</style>

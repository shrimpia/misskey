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
	<template #header><i class="ti ti-brush"></i> {{ i18n.ts._shDrawing.title }} (Beta)</template>

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
			@clear="clearCanvas"
		/>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, markRaw, ref, useTemplateRef, watch } from 'vue';
import * as Misskey from 'misskey-js';
import { debounce } from 'throttle-debounce';
import XViewport from './ShDrawingDialog.Viewport.vue';
import XToolbar from './ShDrawingDialog.Toolbar.vue';
import XPropertyBar from './ShDrawingDialog.PropertyBar.vue';
import type { DrawingToolKind } from '@/utility/drawing/types.js';
import type { Keymap } from '@/utility/hotkey.js';
import { createDefaultDrawingSettings } from '@/utility/drawing/types.js';
import { DrawingHistory } from '@/utility/drawing/history.js';
import { deleteDrawingDraft, loadDrawingDraft, saveDrawingDraft } from '@/utility/drawing/draft.js';
import { ensureSignin } from '@/i.js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import { useBeforeUnloadGuard } from '@/composables/use-before-unload-guard.js';
import { uploadFile } from '@/utility/drive.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const $i = ensureSignin();

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

async function onReady(snapshot: ImageData) {
	const draft = await loadDrawingDraft($i.id);

	if (draft != null && viewport.value != null) {
		try {
			const restored = await viewport.value.drawImageFromDataUrl(draft.dataUrl);
			settings.value = draft.settings;
			history.reset(restored);
			os.toast(i18n.ts._shDrawing.draftRestored);
		} catch (err) {
			// 下書きが壊れていても白紙で始められるようにする
			console.error(err);
			history.reset(viewport.value.clearToBackground());
		}
	} else {
		history.reset(snapshot);
	}

	historyVersion.value++;
	ready.value = true;
}

/** 下書きの保存失敗を知らせたか (毎回出すと煩いので一度だけ) */
let draftFailureNotified = false;

/** 現在のキャンバスを下書きとして保存する */
async function flushDraft() {
	if (viewport.value == null || !ready.value) return;
	const saved = await saveDrawingDraft($i.id, {
		dataUrl: viewport.value.toDataUrl(),
		settings: settings.value,
		updatedAt: Date.now(),
	});

	// 保存できていないことに気付けないと、閉じた後に下書きが無いことで初めて分かってしまう
	if (!saved && !draftFailureNotified) {
		draftFailureNotified = true;
		os.toast(i18n.ts._shDrawing.draftSaveFailed);
	}
}

// 描くたびに書き込むと重いので、少し落ち着いてから保存する
const saveDraftDebounced = debounce(800, () => {
	flushDraft().catch(err => console.error(err));
});

watch([historyVersion, settings], () => {
	if (ready.value) saveDraftDebounced();
});

async function clearCanvas() {
	if (viewport.value == null || saving.value) return;

	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._shDrawing.clearCanvasConfirm,
	});
	if (canceled) return;

	history.reset(viewport.value.clearToBackground());
	historyVersion.value++;
	saveDraftDebounced.cancel();
	await deleteDrawingDraft($i.id);
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
				type: 'question',
				text: i18n.ts._shDrawing.leaveWithDraftConfirm,
			});
			if (canceled) return;
		} finally {
			confirmingClose = false;
		}

		// 閉じる前に、待機中の下書き保存を確実に書き切る
		saveDraftDebounced.cancel();
		await flushDraft();
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
		// アップロードできたので下書きは不要
		saveDraftDebounced.cancel();
		await deleteDrawingDraft($i.id);
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

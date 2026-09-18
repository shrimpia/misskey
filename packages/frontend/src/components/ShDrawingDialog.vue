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
			:spec="spec"
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
			@menu="showMenu"
		/>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, markRaw, nextTick, ref, useTemplateRef, watch } from 'vue';
import * as Misskey from 'misskey-js';
import { debounce } from 'throttle-debounce';
import XViewport from './ShDrawingDialog.Viewport.vue';
import XToolbar from './ShDrawingDialog.Toolbar.vue';
import XPropertyBar from './ShDrawingDialog.PropertyBar.vue';
import type { DrawingCanvasSpec, DrawingToolKind } from '@/utility/drawing/types.js';
import type { DrawingResizeResult } from '@/components/ShDrawingResizeDialog.vue';
import { offsetForAnchor } from '@/utility/drawing/resize.js';
import type { Keymap } from '@/utility/hotkey.js';
import { DEFAULT_CANVAS_SPEC, createDefaultDrawingSettings, historyLimitFor, specForImage } from '@/utility/drawing/types.js';
import { DrawingHistory } from '@/utility/drawing/history.js';
import { deleteDrawingDraft, loadDrawingDraft, saveDrawingDraft } from '@/utility/drawing/draft.js';
import { ensureSignin } from '@/i.js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import { useBeforeUnloadGuard } from '@/composables/use-before-unload-guard.js';
import { uploadFile, chooseDriveFile } from '@/utility/drive.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
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
const spec = ref<DrawingCanvasSpec>({ ...DEFAULT_CANVAS_SPEC });

const history = markRaw(new DrawingHistory<ImageData>(historyLimitFor(spec.value)));
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

/** キャンバスの仕様を差し替え、まっさらな状態にして、その内容を返す */
async function applySpec(next: DrawingCanvasSpec): Promise<ImageData | null> {
	spec.value = next;
	history.setLimit(historyLimitFor(next));
	// canvas の width / height 属性が反映されるのを待つ (属性が変わると内容は破棄される)
	await nextTick();
	if (viewport.value == null) return null;
	const snapshot = viewport.value.clearToBackground();
	viewport.value.resetView();
	return snapshot;
}

async function onReady(snapshot: ImageData) {
	const draft = await loadDrawingDraft($i.id);

	if (draft != null && viewport.value != null) {
		try {
			await applySpec(draft.spec);
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
		spec: spec.value,
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

/** 新しいキャンバスの大きさと下地を選んでもらい、その内容で作り直す */
function openNewCanvasDialog() {
	if (saving.value) return;

	const { dispose } = os.popup(defineAsyncComponent(() => import('@/components/ShDrawingNewCanvasDialog.vue')), {
		current: spec.value,
	}, {
		done: (next) => {
			newCanvas(next).catch(err => console.error(err));
		},
		closed: () => dispose(),
	});
}

function showMenu(ev: MouseEvent) {
	if (saving.value) return;

	os.popupMenu([{
		text: i18n.ts._shDrawing.newCanvas,
		icon: 'ti ti-file-plus',
		action: () => openNewCanvasDialog(),
	}, {
		text: i18n.ts._shDrawing.loadFromDrive,
		icon: 'ti ti-cloud-download',
		action: () => {
			loadFromDrive().catch(err => console.error(err));
		},
	}, { type: 'divider' }, {
		text: i18n.ts._shDrawing.resizeCanvas,
		icon: 'ti ti-crop',
		action: () => openResizeDialog('canvas'),
	}, {
		text: i18n.ts._shDrawing.resizeImage,
		icon: 'ti ti-arrows-diagonal',
		action: () => openResizeDialog('image'),
	}], ev.currentTarget ?? ev.target);
}

/** キャンバスの大きさを変える。canvas は拡縮せず切り抜き / 余白、image は再サンプリング */
function openResizeDialog(mode: 'canvas' | 'image') {
	if (saving.value || !ready.value) return;

	const { dispose } = os.popup(defineAsyncComponent(() => import('@/components/ShDrawingResizeDialog.vue')), {
		mode,
		current: spec.value,
	}, {
		done: (result) => {
			applyResize(mode, result).catch(err => console.error(err));
		},
		closed: () => dispose(),
	});
}

async function applyResize(mode: 'canvas' | 'image', result: DrawingResizeResult) {
	if (viewport.value == null) return;

	// 大きさを変えると canvas の内容は失われるので、先に写しておく
	const source = viewport.value.cloneCanvas();
	const from = { width: spec.value.width, height: spec.value.height };
	const to = { width: result.width, height: result.height };

	await applySpec({ ...spec.value, ...to });
	if (viewport.value == null) return;

	let snapshot: ImageData;
	if (mode === 'canvas') {
		const offset = offsetForAnchor(result.anchor, from, to);
		snapshot = viewport.value.drawImageAt(source, offset.x, offset.y);
	} else {
		snapshot = viewport.value.drawImage(source, { smooth: result.smooth });
	}

	// 大きさの違うスナップショットは復元できないため、履歴はここで作り直す
	history.reset(snapshot);
	historyVersion.value++;
	saveDraftDebounced();
}

/** 今の内容を捨ててよいか確認する (描き始めていなければ聞かない) */
async function confirmDiscard(): Promise<boolean> {
	if (!isDirty.value) return true;

	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._shDrawing.replaceCanvasConfirm,
	});
	return !canceled;
}

/** ドライブの画像を読み込んで、その大きさのキャンバスにする */
async function loadFromDrive() {
	if (saving.value) return;

	const [driveFile] = await chooseDriveFile({ multiple: false });
	if (driveFile == null) return;

	if (!await confirmDiscard()) return;

	const done = os.waiting();
	try {
		const image = await loadImage(getProxiedImageUrl(driveFile.url, undefined, true));
		// 透過を保てる形式なら下地も透明にして、元画像の透明部分をそのまま活かす
		const background = /^image\/(png|webp|gif|avif)$/.test(driveFile.type) ? null : '#ffffff';
		await applySpec(specForImage(image.naturalWidth, image.naturalHeight, background));
		if (viewport.value == null) return;

		history.reset(viewport.value.drawImage(image));
		historyVersion.value++;
		saveDraftDebounced();
		done();
		os.toast(i18n.ts._shDrawing.imageLoaded);
	} catch (err) {
		console.error(err);
		done();
		os.alert({
			type: 'error',
			text: i18n.ts._shDrawing.failedToLoadImage,
		});
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		// キャンバスが汚染されると getImageData / toDataURL が使えなくなるため、CORS 付きで読む
		image.crossOrigin = 'anonymous';
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('Failed to load image'));
		image.src = src;
	});
}

async function newCanvas(next: DrawingCanvasSpec) {
	const snapshot = await applySpec(next);
	if (snapshot == null) return;

	history.reset(snapshot);
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

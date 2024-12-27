<template>
<div class="_gaps_m">
	<FormSection>
		<template #label>独自機能</template>
		<div class="_gaps_m">
			<div>シュリンピア固有の機能を有効・無効にします。</div>

			<MkSwitch v-model="nicknameEnabled">
				ニックネーム機能
				<template #caption>
					ユーザーページにて、ユーザーの名前をクリック/タップすることで好きなものに変更できるようになります。変更は自分にのみ反映されます。<br>
					頻繁に名前を変更するユーザーを識別するときなどに使えます。
				</template>
			</MkSwitch>
			<MkSwitch v-model="stealEnabled">
				パクる機能
				<template #caption>
					ノートをコピーしてそのまま投稿する機能。
				</template>
			</MkSwitch>
			<MkSwitch v-model="headlineEnabled">
				シュリンピアヘッドライン <span class="_beta">{{ i18n.ts.beta }}</span>
				<template #caption>
					帝国のお知らせ、ヒント、イベント情報などをお知らせします。
				</template>
			</MkSwitch>
		</div>
	</FormSection>
	<FormSection>
		<template #label>パッチ</template>
		<div class="_gaps_m">
			<div>Misskeyの機能に変更を加えます。</div>

			<MkSwitch v-model="infoButtonForNoteActionsEnabled">
				ノートに詳細表示ボタンを表示する
				<template #caption>
					オプション「ノートの操作部をホバー時のみ表示する」をオンにしたときに適用されます。
				</template>
			</MkSwitch>
			<MkSwitch v-model="rememberPostFormToggleStateEnabled">
				投稿フォームにて、プレビューのオン・オフを記憶する
			</MkSwitch>
			<MkSwitch v-model="reactableRemoteReactionEnabled">
				リモートのカスタム絵文字リアクションでも、このサーバーに同じ名前の絵文字があればリアクションできるようにする
			</MkSwitch>
			<MkSwitch v-model="showFollowingMessageInsteadOfButtonEnabled">
				既にフォローしている場合、通知欄にフォローボタンを表示しない
			</MkSwitch>
		</div>
	</FormSection>
	<FormSection>
		<template #label><i class="ti ti-flask"/> Ebisskey Labs</template>
		<div class="_gaps_m">
			<div>まだ開発中の機能を試してみませんか。一部の機能はちゃんと動かないかもしれません。</div>

			<MkSwitch v-model="usePostFormWindow">
				投稿フォームをウィンドウとして表示
			</MkSwitch>
		</div>
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue';
import { Note, User } from 'misskey-js/built/entities';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSection from '@/components/form/section.vue';
import { defaultStore } from '@/store';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';
import { $i } from '@/account';
import { reloadAsk } from '@/scripts/reload-ask';

const nicknameEnabled = computed(defaultStore.makeGetterSetter('nicknameEnabled'));
const stealEnabled = computed(defaultStore.makeGetterSetter('stealEnabled'));
const headlineEnabled = computed(defaultStore.makeGetterSetter('headlineEnabled'));
const infoButtonForNoteActionsEnabled = computed(defaultStore.makeGetterSetter('infoButtonForNoteActionsEnabled'));
const reactableRemoteReactionEnabled = computed(defaultStore.makeGetterSetter('reactableRemoteReactionEnabled'));
const rememberPostFormToggleStateEnabled = computed(defaultStore.makeGetterSetter('rememberPostFormToggleStateEnabled'));
const usePostFormWindow = computed(defaultStore.makeGetterSetter('usePostFormWindow'));
const ebiNoteViewEnabled = computed(defaultStore.makeGetterSetter('ebiNoteViewEnabledLab'));
const showFollowingMessageInsteadOfButtonEnabled = computed(defaultStore.makeGetterSetter('showFollowingMessageInsteadOfButtonEnabled'));

watch([
	stealEnabled,
	headlineEnabled,
	infoButtonForNoteActionsEnabled,
	reactableRemoteReactionEnabled,
], async () => {
	await reloadAsk({ reason: i18n.ts.reloadToApplySetting, unison: true });
});

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePageMetadata({
	title: 'Ebisskey',
	icon: 'ti ti-bulb-filled',
});
</script>

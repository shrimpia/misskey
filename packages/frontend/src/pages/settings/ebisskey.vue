<template>
<div class="_gaps_m">
	<h1>Ebisskey</h1>
	<FormSection>
		<template #label>独自機能</template>
		<div class="_gaps_m">
			<div>Ebisskeyが追加する独自機能を有効・無効にします。</div>

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
			<MkSwitch v-model="featuredTimelineEnabled">
				ハイライトタイムラインをホームに表示する
			</MkSwitch>
			<!--
			<MkSwitch v-model="reactableRemoteReactionEnabled">
				リモートのカスタム絵文字リアクションでも、このサーバーに同じ名前の絵文字があればリアクションできるようにする
			</MkSwitch>
			<MkSwitch v-model="showFollowingMessageInsteadOfButtonEnabled">
				既にフォローしている場合、通知欄にフォローボタンを表示しない
			</MkSwitch>
			-->
		</div>
	</FormSection>
	<FormSection>
		<template #label><i class="ti ti-flask"/> Ebisskey Labs</template>
		<div class="_gaps_m">
			<div>まだ開発中の機能を試してみませんか。一部の機能はちゃんと動かないかもしれません。</div>

			<!-- エアリプ機能 -->
			<MkFolder open>
				<template #label><i class="ti ti-bubble-text"/> エアリプ機能</template>
				<div class="_gaps_m">
					<div>特定のノートに曖昧な返信を行うための、公開範囲を合わせた投稿ボタンを有効化します。</div>
					<MkSwitch v-model="useAirReply">
						エアリプ機能を有効にする
					</MkSwitch>
					<MkSelect v-if="useAirReply" v-model="airReplyButtonPlacement">
						<template #label>ボタンの位置</template>
						<option value="noteMenu">ノートのメニュー</option>
						<option value="renoteMenu">リノートボタンのメニュー</option>
						<option value="noteFooter">ノートの下部</option>
					</MkSelect>
				</div>
			</MkFolder>

			<MkFolder open>
				<template #label><i class="ti ti-tag"/> 公開範囲に応じた色分け</template>
				<div class="_gaps_m">
					<div>ノートの公開範囲に応じて、特殊な色付き表示を行います。</div>
					<MkSwitch v-model="useNoteVisibilityColoring">
						色分けを有効にする
					</MkSwitch>

					<template v-if="useNoteVisibilityColoring">
						<MkColorInput v-model="noteVisibilityColorHome">
							<template #label>{{ i18n.ts._visibility.home }}</template>
						</MkColorInput>
						<MkColorInput v-model="noteVisibilityColorFollowers">
							<template #label>{{ i18n.ts._visibility.followers }}</template>
						</MkColorInput>
						<MkColorInput v-model="noteVisibilityColorSpecified">
							<template #label>{{ i18n.ts._visibility.specified }}</template>
						</MkColorInput>
						<MkColorInput v-model="noteVisibilityColorLocalOnly">
							<template #label>{{ i18n.ts._visibility.disableFederation }}</template>
						</MkColorInput>
					</template>
				</div>
			</MkFolder>

			<MkSwitch v-model="usePostFormWindow">
				投稿フォームをウィンドウとして表示
			</MkSwitch>
		</div>
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSection from '@/components/form/section.vue';
import { defaultStore } from '@/store';
import { definePageMetadata } from '@/scripts/page-metadata';
import { i18n } from '@/i18n';
import { reloadAsk } from '@/scripts/reload-ask.js';
import MkFolder from '@/components/MkFolder.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkColorInput from '@/components/MkColorInput.vue';

const nicknameEnabled = computed(defaultStore.makeGetterSetter('nicknameEnabled'));
const stealEnabled = computed(defaultStore.makeGetterSetter('stealEnabled'));
const infoButtonForNoteActionsEnabled = computed(defaultStore.makeGetterSetter('infoButtonForNoteActionsEnabled'));
const rememberPostFormToggleStateEnabled = computed(defaultStore.makeGetterSetter('rememberPostFormToggleStateEnabled'));
const featuredTimelineEnabled = computed(defaultStore.makeGetterSetter('featuredTimelineEnabled'));
const usePostFormWindow = computed(defaultStore.makeGetterSetter('usePostFormWindow'));
const useAirReply = computed(defaultStore.makeGetterSetter('useAirReply'));
const airReplyButtonPlacement = computed(defaultStore.makeGetterSetter('airReplyButtonPlacement'));
const useNoteVisibilityColoring = computed(defaultStore.makeGetterSetter('useNoteVisibilityColoring'));
const noteVisibilityColorHome = computed(defaultStore.makeGetterSetter('noteVisibilityColorHome'));
const noteVisibilityColorFollowers = computed(defaultStore.makeGetterSetter('noteVisibilityColorFollowers'));
const noteVisibilityColorSpecified = computed(defaultStore.makeGetterSetter('noteVisibilityColorSpecified'));
const noteVisibilityColorLocalOnly = computed(defaultStore.makeGetterSetter('noteVisibilityColorLocalOnly'));

watch([
	stealEnabled,
	infoButtonForNoteActionsEnabled,
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

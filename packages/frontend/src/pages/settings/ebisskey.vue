<template>
<SearchMarker path="/settings/ebisskey" label="独自機能" :keywords="['ebisskey']" icon="ti ti-power">
	<div class="_gaps_m">
		<h1>Ebisskey</h1>
		<FormSection>
			<template #label>独自機能</template>
			<div class="_gaps_m">
				<div>Ebisskeyが追加する独自機能を有効・無効にします。</div>

				<SearchMarker :keywords="['nickname']">
					<MkSwitch v-model="nicknameEnabled">
						<SearchLabel>ニックネーム機能</SearchLabel>
						<template #caption>
							ユーザーページにて、ユーザーの名前をクリック/タップすることで好きなものに変更できるようになります。変更は自分にのみ反映されます。<br>
							頻繁に名前を変更するユーザーを識別するときなどに使えます。
						</template>
					</MkSwitch>
				</SearchMarker>
				<SearchMarker :keywords="['steal']">
					<MkSwitch v-model="stealEnabled">
						<SearchLabel>パクる機能</SearchLabel>
						<template #caption>
							ノートをコピーしてそのまま投稿する機能。
						</template>
					</MkSwitch>
				</SearchMarker>
			</div>
		</FormSection>
		<FormSection>
			<template #label>パッチ</template>
			<div class="_gaps_m">
				<div>Misskeyの機能に変更を加えます。</div>

				<SearchMarker :keywords="['note', 'info', 'button']">
					<MkSwitch v-model="infoButtonForNoteActionsEnabled">
						<SearchLabel>ノートに詳細表示ボタンを表示する</SearchLabel>
						<template #caption>
							オプション「ノートの操作部をホバー時のみ表示する」をオンにしたときに適用されます。
						</template>
					</MkSwitch>
				</SearchMarker>
				<MkSwitch v-model="rememberPostFormToggleStateEnabled">
					<SearchLabel>投稿フォームにて、プレビューのオン・オフを記憶する</SearchLabel>
				</MkSwitch>
				<MkSwitch v-model="featuredTimelineEnabled">
					<SearchLabel>ハイライトタイムラインをホームに表示する</SearchLabel>
				</MkSwitch>
			</div>
		</FormSection>
		<FormSection>
			<template #label><i class="ti ti-flask"/> Ebisskey Labs</template>
			<div class="_gaps_m">
				<div>まだ開発中の機能を試してみませんか。一部の機能はちゃんと動かないかもしれません。</div>

				<!-- エアリプ機能 -->
				<div class="_panel _padding _gaps_m">
					<SearchMarker :keywords="['air-reply']">
						<MkSwitch v-model="useAirReply">
							<SearchLabel>エアリプ機能</SearchLabel>
							<template #caption>
								特定のノートに曖昧な返信を行うための、公開範囲を合わせた投稿ボタンを有効化します。
							</template>
						</MkSwitch>
					</SearchMarker>
					<MkSelect v-if="useAirReply" v-model="airReplyButtonPlacement">
						<template #label>ボタンの位置</template>
						<option value="noteMenu">ノートのメニュー</option>
						<option value="renoteMenu">リノートボタンのメニュー</option>
						<option value="noteFooter">ノートの下部</option>
					</MkSelect>
				</div>

				<div class="_panel _padding _gaps_m">
					<SearchMarker :keywords="['note', 'visibility', 'coloring']">
						<MkSwitch v-model="useNoteVisibilityColoring">
							<SearchLabel>公開範囲に応じた色分け</SearchLabel>
							<template #caption>
								ノートの公開範囲に応じて、特殊な色付き表示を行います。
							</template>
						</MkSwitch>
					</SearchMarker>
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
							<template #label>{{ i18n.ts._visibility.public }}（{{ i18n.ts._visibility.disableFederation }}）</template>
						</MkColorInput>
						<MkButton v-if="noteVisibilityColorChanged" primary @click="saveColors"><i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}</MkButton>
					</template>
				</div>

				<div class="_panel _padding _gaps_m">
					<SearchMarker :keywords="['textarea', 'auto', 'size']">
						<MkSwitch v-model="useTextAreaAutoSize">
							<SearchLabel>テキストエリアの自動サイズ調整</SearchLabel>
							<template #caption>
								入力したテキストの行数に合わせて長文の入力欄（例：投稿フォーム）の高さを自動調整します。<br/>
								一部のブラウザで正常に動作しないかもしれません。
							</template>
						</MkSwitch>
					</SearchMarker>
				</div>

				<!-- 不具合で動かないため一度オフ -->
				<!-- <MkSwitch v-model="usePostFormWindow">
					投稿フォームをウィンドウとして表示
				</MkSwitch> -->
			</div>
		</FormSection>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSection from '@/components/form/section.vue';
import { i18n } from '@/i18n';
import { reloadAsk } from '@/utility/reload-ask.js';
import MkSelect from '@/components/MkSelect.vue';
import MkColorInput from '@/components/MkColorInput.vue';
import MkButton from '@/components/MkButton.vue';
import { prefer } from '@/preferences';
import { definePage } from '@/page';

const nicknameEnabled = prefer.model('ebisskey.nicknameEnabled');
const stealEnabled = prefer.model('ebisskey.stealEnabled');
const infoButtonForNoteActionsEnabled = prefer.model('ebisskey.infoButtonForNoteActionsEnabled');
const rememberPostFormToggleStateEnabled = prefer.model('ebisskey.rememberPostFormToggleStateEnabled');
const featuredTimelineEnabled = prefer.model('ebisskey.featuredTimelineEnabled');
const useAirReply = prefer.model('ebisskey.useAirReply');
const airReplyButtonPlacement = prefer.model('ebisskey.airReplyButtonPlacement');
const useNoteVisibilityColoring = prefer.model('ebisskey.useNoteVisibilityColoring');
const useTextAreaAutoSize = prefer.model('ebisskey.useTextAreaAutoSize');

const noteVisibilityColorHome = ref(prefer.s['ebisskey.noteVisibilityColorHome']);
const noteVisibilityColorFollowers = ref(prefer.s['ebisskey.noteVisibilityColorFollowers']);
const noteVisibilityColorSpecified = ref(prefer.s['ebisskey.noteVisibilityColorSpecified']);
const noteVisibilityColorLocalOnly = ref(prefer.s['ebisskey.noteVisibilityColorLocalOnly']);
const noteVisibilityColorChanged = ref(false);

watch([
	noteVisibilityColorHome,
	noteVisibilityColorFollowers,
	noteVisibilityColorSpecified,
	noteVisibilityColorLocalOnly,
], () => {
	noteVisibilityColorChanged.value = true;
});

watch([
	stealEnabled,
	infoButtonForNoteActionsEnabled,
	useAirReply,
	airReplyButtonPlacement,
	useNoteVisibilityColoring,
	useTextAreaAutoSize,
], async () => {
	await reloadAsk({ reason: i18n.ts.reloadToApplySetting, unison: true });
});

function saveColors() {
	if (noteVisibilityColorChanged.value) {
		prefer.commit('ebisskey.noteVisibilityColorHome', noteVisibilityColorHome.value);
		prefer.commit('ebisskey.noteVisibilityColorFollowers', noteVisibilityColorFollowers.value);
		prefer.commit('ebisskey.noteVisibilityColorSpecified', noteVisibilityColorSpecified.value);
		prefer.commit('ebisskey.noteVisibilityColorLocalOnly', noteVisibilityColorLocalOnly.value);
		noteVisibilityColorChanged.value = false;
	}
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage({
	title: 'Ebisskey',
	icon: 'ti ti-bulb-filled',
});
</script>

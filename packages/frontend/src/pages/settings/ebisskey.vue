<template>
<SearchMarker path="/settings/ebisskey" label="独自機能" :keywords="['ebisskey']" icon="ti ti-power">
	<div class="_gaps_m">
		<MkFeatureBanner icon="/client-assets/shrimp_3d.png" color="#b93e43">
			<SearchKeyword>
				本サーバー独自の機能を有効化・無効化できます。
			</SearchKeyword>
		</MkFeatureBanner>
		<FormSection>
			<template #label>独自機能</template>
			<div class="_gaps_m">
				<SearchMarker :keywords="['nickname']">
					<MkPreferenceContainer k="ebisskey.nicknameEnabled">
						<MkSwitch v-model="nicknameEnabled">
							<SearchLabel>ニックネーム機能</SearchLabel>
							<template #caption>
								ユーザーページにて、ユーザーの名前をクリック/タップすることで好きなものに変更できるようになります。変更は自分にのみ反映されます。<br>
								頻繁に名前を変更するユーザーを識別するときなどに使えます。
							</template>
						</MkSwitch>
					</MkPreferenceContainer>
				</SearchMarker>
				<SearchMarker :keywords="['steal']">
					<MkPreferenceContainer k="ebisskey.stealEnabled">
						<MkSwitch v-model="stealEnabled">
							<SearchLabel>パクる機能</SearchLabel>
							<template #caption>
								ノートをコピーしてそのまま投稿する機能。
							</template>
						</MkSwitch>
					</MkPreferenceContainer>
				</SearchMarker>
			</div>
		</FormSection>
		<FormSection>
			<template #label>パッチ</template>
			<div class="_gaps_m">
				<div>Misskeyの機能に変更を加えます。</div>

				<SearchMarker :keywords="['note', 'info', 'button']">
					<MkPreferenceContainer k="ebisskey.infoButtonForNoteActionsEnabled">
						<MkSwitch v-model="infoButtonForNoteActionsEnabled">
							<SearchLabel>ノートに詳細表示ボタンを表示する</SearchLabel>
							<template #caption>
								オプション「{{ i18n.ts.showNoteActionsOnlyHover }}」をオンにしたときに適用されます。
							</template>
						</MkSwitch>
					</MkPreferenceContainer>
				</SearchMarker>
				<MkSwitch :modelValue="true" disabled>
					<SearchLabel>投稿フォームにて、プレビューのオン・オフを記憶する</SearchLabel>
					<template #caption>
						この機能は本家に正式実装されたため、独自機能としては廃止しました。
					</template>
				</MkSwitch>
				<MkPreferenceContainer k="ebisskey.featuredTimelineEnabled">
					<MkSwitch v-model="featuredTimelineEnabled">
						<SearchLabel>ハイライトタイムラインをホームに表示する</SearchLabel>
					</MkSwitch>
				</MkPreferenceContainer>
				<MkPreferenceContainer k="shrimpia.headlineEnabled">
					<SearchMarker :keywords="['shrimpia', 'headline']">
						<MkSwitch v-model="headlineEnabled">
							シュリンピアヘッドライン <span class="_beta">{{ i18n.ts.beta }}</span>
							<template #caption>
								帝国のお知らせ、ヒント、イベント情報などをお知らせします。
							</template>
						</MkSwitch>
					</SearchMarker>
				</MkPreferenceContainer>
			</div>
		</FormSection>
		<FormSection>
			<template #label><i class="ti ti-flask"/> Ebisskey Labs</template>
			<div class="_gaps_m">
				<div>まだ開発中の機能を試してみませんか。一部の機能はちゃんと動かないかもしれません。</div>

				<!-- エアリプ機能 -->
				<SearchMarker :keywords="['air-reply']">
					<MkFolder :defaultOpen="useAirReply">
						<template #icon><i class="ti ti-bubble-text"></i></template>
						<template #label><SearchLabel>エアリプ機能</SearchLabel></template>
						<div class="_gaps_m">
							<div>
								ノートに、公開範囲を合わせた投稿フォームを開くボタンを追加します。<br/>
								特定のノートに曖昧な返信を行うときに便利です。
							</div>
							<MkPreferenceContainer k="ebisskey.useAirReply">
								<MkSwitch v-model="useAirReply">
									<SearchLabel>オンにする</SearchLabel>
								</MkSwitch>
							</MkPreferenceContainer>
							<MkPreferenceContainer k="ebisskey.airReplyButtonPlacement">
								<MkSelect v-model="airReplyButtonPlacement">
									<template #label>ボタンの位置</template>
									<option value="noteMenu">ノートのメニュー</option>
									<option value="renoteMenu">リノートボタンのメニュー</option>
									<option value="noteFooter">ノートの下部</option>
								</MkSelect>
							</MkPreferenceContainer>
						</div>
					</MkFolder>
				</SearchMarker>

				<!-- ノートの公開範囲に応じた色分け -->
				<SearchMarker :keywords="['note', 'visibility', 'coloring']">
					<MkFolder :defaultOpen="useNoteVisibilityColoring">
						<template #icon><i class="ti ti-color-swatch"></i></template>
						<template #label><SearchLabel>ノートの公開範囲に応じた色分け</SearchLabel></template>
						<div class="_gaps_m">
							<div>
								ノートの公開範囲に応じて、色付き表示を行います。<br/>
								ノートの公開範囲をより視覚的に区別することができます。
							</div>
							<MkPreferenceContainer k="ebisskey.useNoteVisibilityColoring">
								<MkSwitch v-model="useNoteVisibilityColoring">
									<SearchLabel>オンにする</SearchLabel>
								</MkSwitch>
							</MkPreferenceContainer>

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
						</div>
						<template #footer>
							<div class="_buttons">
								<MkButton :disabled="!noteVisibilityColorChanged" primary @click="saveColors">
									<i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}
								</MkButton>
							</div>
						</template>
					</MkFolder>
				</SearchMarker>

				<MkFolder :defaultOpen="true">
					<template #icon><i class="ti ti-settings"></i></template>
					<template #label>その他</template>
					<SearchMarker :keywords="['textarea', 'auto', 'size']">
						<MkSwitch v-model="useTextAreaAutoSize">
							<SearchLabel>テキストエリアの自動サイズ調整</SearchLabel>
							<template #caption>
								入力したテキストの行数に合わせて長文の入力欄（例：投稿フォーム）の高さを自動調整します。<br/>
								一部のブラウザで正常に動作しないかもしれません。
							</template>
						</MkSwitch>
					</SearchMarker>
				</MkFolder>
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
import MkFeatureBanner from '@/components/MkFeatureBanner.vue';
import MkPreferenceContainer from '@/components/MkPreferenceContainer.vue';
import MkFolder from '@/components/MkFolder.vue';
import { PREF_DEF } from '@/preferences/def';

const nicknameEnabled = prefer.model('ebisskey.nicknameEnabled');
const stealEnabled = prefer.model('ebisskey.stealEnabled');
const infoButtonForNoteActionsEnabled = prefer.model('ebisskey.infoButtonForNoteActionsEnabled');
const featuredTimelineEnabled = prefer.model('ebisskey.featuredTimelineEnabled');
const useAirReply = prefer.model('ebisskey.useAirReply');
const airReplyButtonPlacement = prefer.model('ebisskey.airReplyButtonPlacement');
const useNoteVisibilityColoring = prefer.model('ebisskey.useNoteVisibilityColoring');
const useTextAreaAutoSize = prefer.model('ebisskey.useTextAreaAutoSize');

// #region Shrimpia
const headlineEnabled = prefer.model('shrimpia.headlineEnabled');
// #endregion

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
	headlineEnabled,
	infoButtonForNoteActionsEnabled,
	useAirReply,
	airReplyButtonPlacement,
	useNoteVisibilityColoring,
	useTextAreaAutoSize,
], async () => {
	await reloadAsk({ reason: i18n.ts.reloadToApplySetting, unison: true });
});

function saveColors() {
	if (!noteVisibilityColorChanged.value) return;

	prefer.commit('ebisskey.noteVisibilityColorHome', noteVisibilityColorHome.value);
	prefer.commit('ebisskey.noteVisibilityColorFollowers', noteVisibilityColorFollowers.value);
	prefer.commit('ebisskey.noteVisibilityColorSpecified', noteVisibilityColorSpecified.value);
	prefer.commit('ebisskey.noteVisibilityColorLocalOnly', noteVisibilityColorLocalOnly.value);
	noteVisibilityColorChanged.value = false;
}

function resetColors() {
	noteVisibilityColorHome.value = PREF_DEF['ebisskey.noteVisibilityColorHome'].default;
	noteVisibilityColorFollowers.value = PREF_DEF['ebisskey.noteVisibilityColorFollowers'].default;
	noteVisibilityColorSpecified.value = PREF_DEF['ebisskey.noteVisibilityColorSpecified'].default;
	noteVisibilityColorLocalOnly.value = PREF_DEF['ebisskey.noteVisibilityColorLocalOnly'].default;
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage({
	title: 'Ebisskey',
	icon: 'ti ti-bulb-filled',
});
</script>

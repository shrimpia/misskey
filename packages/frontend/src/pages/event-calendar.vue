<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><MkPageHeader/></template>
	<MkSpacer :contentMax="800">
		<Transition
			:enterActiveClass="defaultStore.state.animation ? $style.transition_fade_enterActive : ''"
			:leaveActiveClass="defaultStore.state.animation ? $style.transition_fade_leaveActive : ''"
			:enterFromClass="defaultStore.state.animation ? $style.transition_fade_enterFrom : ''"
			:leaveToClass="defaultStore.state.animation ? $style.transition_fade_leaveTo : ''"
			mode="out-in"
		>
			<MkLoading v-if="fetching"/>

			<MkError v-else-if="error" @retry="init()"/>

			<div v-else-if="empty" key="_empty_" class="empty">
				<slot name="empty">
					<div class="_fullinfo">
						<img :src="infoImageUrl" class="_ghost"/>
						<div>{{ i18n.ts.nothing }}</div>
					</div>
				</slot>
			</div>

			<div v-else class="_gaps">
				<MkInfo>
					帝国にて今後開催予定のイベントです。<br/>
					イベントを作成する場合は<a class="_link" href="https://portal.shrimpia.network/events" target="_blank" rel="noreferrer noopener">シュリンピアポータル</a>をご利用ください。
				</MkInfo>
				<section v-for="event in events" :key="event.id" class="_panel" :class="$style.event">
					<div :class="$style.header">
						<h1 :class="$style.title"><i v-if="event.isOfficial" v-tooltip="'公式イベントです！'" :class="$style.official" class="ti ti-discount-check-filled"></i> {{ event.name }}</h1>
						<div :class="$style.date">
							{{ getDateString(event) }}
						</div>
						<div :class="$style.author">
							<MkMention :username="event.authorName" host="mk.shrimpia.network"/>
						</div>
					</div>
					<div v-if="event.description" :class="$style.content">
						<Mfm :text="event.description"/>
					</div>
				</section>
			</div>
		</Transition>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { $i, updateAccount } from '@/account.js';
import { infoImageUrl } from '@/instance.js';
import { defaultStore } from '@/store.js';
import MkInfo from '@/components/MkInfo.vue';
import MkMention from '@/components/MkMention.vue';
import { fetchEvents, Event } from '@/scripts/portal-api/events.js';

definePageMetadata(() => ({
	title: 'イベントカレンダー',
	icon: 'ti ti-calendar-bolt',
}));

const events = ref<Event[]>([]);

const fetching = ref(true);
const error = ref(false);
const empty = computed(() => events.value.length === 0);

const init = async () => {
	fetching.value = true;
	error.value = false;

	try {
		const today = new Date();
		events.value = (await fetchEvents()).filter((ev: Event) => ev.endDate >= today);
	} catch (e) {
		error.value = true;
	} finally {
		fetching.value = false;
	}
};

onMounted(() => init());

const getDateString = (event: Event) => {
	// 終日予定なら YYYY/MM/DD のみ
	// 開始日と終了日が同じなら開始日のみ

	const startDateString = event.isAllDay ? event.startDate.toLocaleDateString() : event.startDate.toLocaleString();
	const endDateString = event.isAllDay ? event.endDate.toLocaleDateString() : event.endDate.toLocaleString();

	if (startDateString === endDateString) {
		return startDateString;
	} else {
		return `${startDateString} 〜 ${endDateString}`;
	}
};

</script>

<style lang="scss" module>
.transition_fade_enterActive,
.transition_fade_leaveActive {
	transition: opacity 0.125s ease;
}
.transition_fade_enterFrom,
.transition_fade_leaveTo {
	opacity: 0;
}

.event {
	padding: 16px;
}

.official {
	color: var(--MI_THEME-accent);
}

.title {
	font-size: 1rem;
	font-weight: bold;
	margin: 0 0 8px 0;
}

.date {
	font-size: 90%;
	opacity: 0.7;
}

.content {
	padding: 16px;
	margin-top: 16px;
	border: dashed 1px var(--MI_THEME-divider);
	border-radius: 8px;
}
</style>

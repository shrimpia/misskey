<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer _gaps" style="--MI_SPACER-w: 700px;">
		<MkFeatureBanner icon="/client-assets/calendar_3d.png" color="#B93E43">
			シュリンピアでイベントを開催しましょう。
			ゲーム大会、オフ会、創作企画、部活動など、シュリンピア上で開催するイベントであれば、どなたでも自由に登録できます！
		</MkFeatureBanner>
		<Transition
			:enterActiveClass="prefer.s.animation ? $style.transition_fade_enterActive : ''"
			:leaveActiveClass="prefer.s.animation ? $style.transition_fade_leaveActive : ''"
			:enterFromClass="prefer.s.animation ? $style.transition_fade_enterFrom : ''"
			:leaveToClass="prefer.s.animation ? $style.transition_fade_leaveTo : ''"
			mode="out-in"
		>
			<MkLoading v-if="fetching"/>

			<MkError v-else-if="error" @retry="init()"/>

			<MkResult v-else-if="empty" type="empty"/>

			<div v-else class="_gaps">
				<section v-for="event in events" :key="event.id" class="_panel" :class="$style.event">
					<div :class="$style.header">
						<h1 :class="$style.title"><i v-if="event.isOfficial" v-tooltip="'公式イベントです！'" :class="$style.official" class="ti ti-discount-check-filled"></i> {{ event.name }}</h1>
						<div :class="$style.date">
							<i class="ti ti-calendar"></i> {{ getDateString(event) }}
						</div>
						<div :class="$style.author">
							<i class="ti ti-user"></i> <MkMention :username="event.authorName" host="mk.shrimpia.network"/>
						</div>
					</div>
					<div v-if="event.description" :class="$style.content">
						<Mfm :text="event.description"/>
					</div>
				</section>
			</div>
		</Transition>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import type { Event } from '@/scripts/portal-api/events.js';
import MkMention from '@/components/MkMention.vue';
import { fetchEvents } from '@/scripts/portal-api/events.js';
import { definePage } from '@/page.js';
import { prefer } from '@/preferences.js';
import MkFeatureBanner from '@/components/MkFeatureBanner.vue';

definePage(() => ({
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

const headerActions = computed(() => [{
	asFullButton: true,
	icon: 'ti ti-building-broadcast-tower',
	text: 'シュリンピアポータルで開く',
	handler: () => {
		window.open('https://portal.shrimpia.network/events', '_blank', 'noopener noreferrer');
	},
}]);

const headerTabs = computed(() => []);

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

.date, .author {
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

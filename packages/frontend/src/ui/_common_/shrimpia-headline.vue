<!--
SPDX-FileCopyrightText: shrimpia
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<MkA :to="currentArticle?.link || ''" :class="$style.inner">
		<i :class="[$style.icon, currentArticle?.iconClass ?? '']"/>
		<div ref="textEl" :class="$style.text"/>
	</MkA>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, nextTick } from 'vue';
import { MfmNode, parse } from 'mfm-js';
import { fetchEvents, Event } from '@/scripts/portal-api/events';
import MkA from '@/components/global/MkA.vue';
import { fetchHints } from '@/scripts/portal-api/hints';
import { $i } from '@/account';

const articleQueue = ref<Article[]>([]);
const currentIndex = ref(0);
const textEl = ref<HTMLElement | null>(null);
let eventArticles: Article[] = [];
let hintArticles: Article[] = [];
const currentArticle = ref<Article | null>(null);

type Article = {
	title: string;
	text: string;
	iconClass: string;
	link?: string;
};

const iconClasses = {
	'info': 'ti ti-info-circle',
	'warning': 'ti ti-alert-triangle',
	'error': 'ti ti-circle-x',
	'success': 'ti ti-check',
};

const fillQueue = () => {
	// イベントデータをつっこむ
	let q: Article[] = [];
	for (const article of eventArticles) {
		q.push(article);
	}
	// ヒントデータをつっこむ
	for (const article of hintArticles) {
		q.push(article);
	}

	// シャッフル
	q = q.map((a) => [Math.random(), a] as const)
		.sort((a, b) => a[0] - b[0])
		.map(a => a[1]);

	// 未読のお知らせを先頭に追加
	const unreadAnnouncements = $i?.unreadAnnouncements.filter(a => a.display === 'banner') ?? [];
	const announcementArticles = unreadAnnouncements.map(a => ({
		title: a.title,
		text: a.text.length > 140 ? a.text.slice(0, 140) + '...' : a.text,
		iconClass: iconClasses[a.icon],
		link: '/announcements/' + a.id,
	}));

	q = [...announcementArticles, ...q];

	articleQueue.value = q;
};

const escapeHtml = (unsafe: string) => {
	return unsafe
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll('\'', '&#039;');
};

const changeText = async () => {
	if (!textEl.value) return;
	if (!articleQueue.value.length) {
		fillQueue();
	}
	const article = articleQueue.value.shift();
	if (!article) return;
	textEl.value.classList.remove('marquee');

	textEl.value.innerHTML = `<b>${escapeHtml(article.title)}</b>　${escapeHtml(article.text)}`;
	currentArticle.value = article;
	const speed = 120;
	const duration = textEl.value.offsetWidth / speed;
	textEl.value.style.setProperty('--marquee-duration', `${duration}s`);
	textEl.value.classList.add('marquee');
	currentIndex.value = (currentIndex.value + 1) % articleQueue.value.length;

	setTimeout(changeText, duration * 1000 + 500);
};

const toPlainText = (nodes: MfmNode[]): string => {
	return nodes.map((node) => {
		switch (node.type) {
			case 'text':
				return node.props.text;
			case 'mention':
				return node.props.acct;
			case 'hashtag':
				return '#' + node.props.hashtag;
			case 'url':
				return node.props.url;
			case 'search':
				return node.props.content;
			case 'emojiCode':
				return `:${node.props.name}:`;
			case 'unicodeEmoji':
				return node.props.emoji;
			case 'mathBlock':
			case 'mathInline':
				return node.props.formula;
			case 'blockCode':
			case 'inlineCode':
				return node.props.code;
			case 'center':
			case 'plain':
			case 'quote':
			case 'fn':
			case 'small':
			case 'bold':
			case 'italic':
			case 'strike':
			case 'link':
				return toPlainText(node.children);
			default:
				return '';
		}
	}).join(' ');
};

const fetchEventArticles = async () => {
	try {
		const today = new Date();
		const after2Week = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 14);
		const events = (await fetchEvents()).filter((ev: Event) => ev.endDate >= today && ev.startDate < after2Week);
		const a: Article[] = [];
		for (const ev of events) {
			const date = ev.isAllDay
				? `【${ev.startDate.getMonth() + 1}/${ev.startDate.getDate()}～】`
				: `【${ev.startDate.getMonth() + 1}/${ev.startDate.getDate()} ${ev.startDate.getHours()}:${ev.startDate.getMinutes().toString().padStart(2, '0')}～】`;

			// 本文は最大140文字に制限
			let description = toPlainText(parse(ev.description));
			a.push({
				title: `${date} ${ev.name}`,
				text: description.length > 140 ? description.slice(0, 140) + '...' : description,
				iconClass: 'ti ti-calendar-bolt',
				link: '/events',
			});
			eventArticles = a;
		}
	} catch (error) {
		console.error('Failed to call Shrimpia Portal, so event articles are not displayed.');
	}
};

const fetchHintArticles = async () => {
	try {
		hintArticles = (await fetchHints()).map(h => ({
			title: '',
			text: h.content,
			iconClass: 'ti ti-bulb',
			link: h.url ?? undefined,
		}));
	} catch (error) {
		console.error('Failed to call Shrimpia Portal, so hint articles are not displayed.');
	}
};

onMounted(async () => {
	await fetchEventArticles();
	await fetchHintArticles();
	nextTick(() => changeText());
});

</script>

<style lang="scss" module>
.root {
	width: 100%;
	min-width: 0;
	font-size: 14px;
	background: var(--headlineBg);
	color: var(--headlineFg);
	align-items: center;
}

.inner {
	display: flex;
	width: 100%;
	align-items: stretch;
	padding: 5px 0;
	min-width: 0;
	overflow: hidden;
}

.icon {
	margin-right: 4px;
	display: flex;
	padding: 0 8px;
	align-items: center;
	font-weight: bold;
	justify-content: center;
	background: var(--headlineBg);
	box-shadow: var(--headlineBg) 8px 0 8px;
	z-index: 1;
}

.text {
	flex: 1;
	opacity: 1;
	white-space: nowrap;
	padding-left: 100%;
}

.hide {
	opacity: 0;
}
</style>

<style scoped>
	.marquee {
		animation: marquee var(--marquee-duration) linear;
	}

	@keyframes marquee {
		0% { transform: translateX(0); }
		100% { transform: translateX(-100%); }
	}
</style>

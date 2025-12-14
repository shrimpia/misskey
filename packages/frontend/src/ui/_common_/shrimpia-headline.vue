<!--
SPDX-FileCopyrightText: shrimpia
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div role="button" :class="$style.inner" @click="showDialog">
		<i :class="[$style.icon, currentArticle?.iconClass ?? '']"/>
		<div
			ref="textEl"
			:class="[
				$style.text,
				!animated && displayState === 'fadingIn' && $style.fadeIn,
				!animated && displayState === 'fadingOut' && $style.fadeOut
			]"
		/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, nextTick, defineAsyncComponent } from 'vue';
import { parse } from 'mfm-js';
import type { MfmNode } from 'mfm-js';
import type { Event } from '@/scripts/portal-api/events';
import { fetchEvents } from '@/scripts/portal-api/events';
import { fetchHints } from '@/scripts/portal-api/hints';
import { $i } from '@/i.js';
import { prefer } from '@/preferences';
import { popup } from '@/os';

const articleQueue = ref<Article[]>([]);
const currentIndex = ref(0);
const textEl = ref<HTMLElement | null>(null);
let eventArticles: Article[] = [];
let hintArticles: Article[] = [];
const currentArticle = ref<Article | null>(null);

type Article = {
	type: 'event' | 'hint' | 'announcement';
	title: string;
	text: string;
	iconClass: string;
	link?: string;
	isExternalLink?: boolean;
};

// フェードモード用の状態管理
type DisplayState = 'fadingIn' | 'showing' | 'fadingOut';
const displayState = ref<DisplayState>('showing');

// フェードモードのタイミング定数
const FADE_DURATION = 500; // 0.5秒
const FADE_SHOW_DURATION = 10000; // 10秒

const SHRIMPIA_URL = 'https://mk.shrimpia.network';

const iconClasses = {
	'info': 'ti ti-info-circle',
	'warning': 'ti ti-alert-triangle',
	'error': 'ti ti-circle-x',
	'success': 'ti ti-check',
};

const animated = prefer.s['shrimpia.headlineViewMode'] === 'alwaysAnimated'
	|| (prefer.s['shrimpia.headlineViewMode'] === 'followAnimatedSettings' && prefer.s.animation);

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
		type: 'announcement',
		title: a.title,
		text: a.text.length > 140 ? a.text.slice(0, 140) + '...' : a.text,
		iconClass: iconClasses[a.icon],
		link: '/announcements/' + a.id,
	} satisfies Article));

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

// 共通: テキスト設定処理
const setArticleText = (article: Article) => {
	if (!textEl.value) return;

	// marqueeクラスを削除
	textEl.value.classList.remove('marquee');

	// テキストの設定
	const escapedTitle = escapeHtml(article.title);
	const escapedText = escapeHtml(article.text);
	textEl.value.innerHTML = escapedTitle ? `<b>${escapedTitle}</b> ${escapedText}` : escapedText;

	currentArticle.value = article;

	// パディングのリセット
	if (!animated) {
		textEl.value.style.setProperty('padding-left', '8px');
	}
};

// フェードイン実行
const fadeIn = async () => {
	if (!textEl.value) return;

	displayState.value = 'fadingIn';
	textEl.value.style.opacity = '0';

	await new Promise<void>(resolve => {
		window.setTimeout(() => {
			if (textEl.value) {
				textEl.value.style.opacity = '1';
			}
			resolve();
		}, 50);
	});

	await new Promise<void>(resolve => window.setTimeout(resolve, FADE_DURATION));
	displayState.value = 'showing';
};

// フェードアウト実行
const fadeOut = async () => {
	if (!textEl.value) return;

	displayState.value = 'fadingOut';
	textEl.value.style.opacity = '0';

	await new Promise<void>(resolve => window.setTimeout(resolve, FADE_DURATION));
};

// マーキーモード用のテキスト変更処理
const changeTextMarquee = async () => {
	if (!textEl.value) return;
	if (!articleQueue.value.length) {
		fillQueue();
	}

	const article = articleQueue.value.shift();
	if (!article) return;

	// テキスト設定
	setArticleText(article);

	// マーキーアニメーション設定
	const speed = 120;
	const duration = textEl.value.offsetWidth / speed;
	textEl.value.style.setProperty('--marquee-duration', `${duration}s`);
	textEl.value.classList.add('marquee');

	currentIndex.value = (currentIndex.value + 1) % articleQueue.value.length;

	// 次のテキストへ
	window.setTimeout(changeText, duration * 1000 + 500);
};

// フェードモード用のテキスト変更処理
const changeTextFade = async () => {
	if (!textEl.value) return;

	// フェードアウト
	await fadeOut();

	// キューのチェックとテキスト設定
	if (!articleQueue.value.length) {
		fillQueue();
	}
	const article = articleQueue.value.shift();
	if (!article) return;

	setArticleText(article);

	// フェードイン
	await fadeIn();

	// 表示時間待機
	await new Promise<void>(resolve => window.setTimeout(resolve, FADE_SHOW_DURATION));

	// 次のサイクルへ
	changeTextFade();
};

// メインのテキスト変更処理
const changeText = async () => {
	if (animated) {
		await changeTextMarquee();
	} else {
		await changeTextFade();
	}
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
				type: 'event',
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
			type: 'hint',
			title: '',
			text: h.content,
			iconClass: 'ti ti-bulb',
			link: (h.url?.startsWith(SHRIMPIA_URL) ? h.url.slice(SHRIMPIA_URL.length) : h.url) ?? undefined,
			isExternalLink: h.url ? !h.url.startsWith(SHRIMPIA_URL) : false,
		}));
	} catch (error) {
		console.error('Failed to call Shrimpia Portal, so hint articles are not displayed.');
	}
};

const showDialog = () => {
	if (!currentArticle.value) return;
	const { dispose } = popup(defineAsyncComponent(() => import('@/components/ShrimpiaHeadlineArticleDialog.vue')), {
		article: currentArticle.value,
	}, {
		closed: () => dispose(),
	});
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
	background: var(--MI_THEME-headlineBg);
	color: var(--MI_THEME-headlineFg);
	font-weight: bold;
	align-items: center;
}

.inner {
	display: flex;
	width: 100%;
	align-items: stretch;
	padding: 5px 0;
	min-width: 0;
	overflow: hidden;
	cursor: pointer;
}

.icon {
	margin-right: 4px;
	display: flex;
	padding: 0 8px;
	align-items: center;
	font-weight: bold;
	justify-content: center;
	background: var(--MI_THEME-headlineBg);
	box-shadow: var(--MI_THEME-headlineBg) 8px 0 8px;
	z-index: 1;
}

.text {
	flex: 1;
	white-space: nowrap;
	padding-left: 100%;
	transition: opacity 0.5s ease-in-out;

	&.fadeIn {
		opacity: 1;
	}

	&.fadeOut {
		opacity: 0;
	}
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

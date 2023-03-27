<template>
<button
	ref="buttonEl"
	v-ripple="canToggle"
	class="_button"
	:class="[$style.root, { [$style.reacted]: note.myReaction == reaction, [$style.canToggle]: canToggle || alternative }]"
	@click="toggleReaction()"
>
	<MkReactionIcon :class="$style.icon" :reaction="reaction" :emoji-url="note.reactionEmojis[reaction.substr(1, reaction.length - 2)]"/>
	<span :class="$style.count">{{ count }}</span>
</button>
</template>

<script lang="ts" setup>
import { computed, onMounted, shallowRef, watch } from 'vue';
import * as misskey from 'misskey-js';
import XDetails from '@/components/MkReactionsViewer.details.vue';
import MkReactionIcon from '@/components/MkReactionIcon.vue';
import * as os from '@/os';
import { useTooltip } from '@/scripts/use-tooltip';
import { $i } from '@/account';
import MkReactionEffect from '@/components/MkReactionEffect.vue';
import { customEmojis } from '@/custom-emojis';
import { claimAchievement } from '@/scripts/achievements';
import { defaultStore } from '@/store';

const props = defineProps<{
	reaction: string;
	count: number;
	isInitial: boolean;
	note: misskey.entities.Note;
}>();

const buttonEl = shallowRef<HTMLElement>();

const reactionName = computed(() => {
	const r = props.reaction.replace(':', '');
	return r.slice(0, r.indexOf('@'));
});

const alternative: ComputedRef<string | null> = computed(() => customEmojis.value.find(it => it.name === reactionName.value)?.name ?? null);

const canToggle = computed(() => !props.reaction.match(/@\w/) && $i);

const toggleReaction = (ev) => {
	if (!canToggle.value) {
		chooseAlternative(ev);
		return;
	}

	const oldReaction = props.note.myReaction;
	if (oldReaction) {
		os.api('notes/reactions/delete', {
			noteId: props.note.id,
		}).then(() => {
			if (oldReaction !== props.reaction) {
				os.api('notes/reactions/create', {
					noteId: props.note.id,
					reaction: props.reaction,
				});
				if (props.reaction.includes('4ttenakuinu')) {
					claimAchievement('yon');
				}
			}
		});
	} else {
		os.api('notes/reactions/create', {
			noteId: props.note.id,
			reaction: props.reaction,
		});
		if (props.note.text && props.note.text.length > 100 && (Date.now() - new Date(props.note.createdAt).getTime() < 1000 * 3)) {
			claimAchievement('reactWithoutRead');
		}
		if (props.reaction.includes('4ttenakuinu')) {
			claimAchievement('yon');
		}
	}
};

const anime = () => {
	if (document.hidden) return;
	if (!defaultStore.state.animation) return;

	const rect = buttonEl.value.getBoundingClientRect();
	const x = rect.left + 16;
	const y = rect.top + (buttonEl.value.offsetHeight / 2);
	os.popup(MkReactionEffect, { reaction: props.reaction, x, y }, {}, 'end');
};

const chooseAlternative = (ev) => {
	// メニュー表示にして、モデレーター以上の場合は登録もできるように
	if (!alternative.value) return;
	console.log(alternative.value);
	os.api('notes/reactions/create', {
		noteId: props.note.id,
		reaction: `:${alternative.value}:`,
	});
	if (alternative.value.includes('4ttenakuinu')) {
		claimAchievement('yon');
	}
};

watch(() => props.count, (newCount, oldCount) => {
	if (oldCount < newCount) anime();
});

onMounted(() => {
	if (!props.isInitial) anime();
});

useTooltip(buttonEl, async (showing) => {
	const reactions = await os.apiGet('notes/reactions', {
		noteId: props.note.id,
		type: props.reaction,
		limit: 11,
		_cacheKey_: props.count,
	});

	const users = reactions.map(x => x.user);

	os.popup(XDetails, {
		showing,
		reaction: props.reaction,
		users,
		count: props.count,
		targetElement: buttonEl.value,
	}, {}, 'closed');
}, 100);
</script>

<style lang="scss" module>
.root {
	display: inline-block;
	height: 32px;
	margin: 2px;
	padding: 0 6px;
	border-radius: 4px;

	&.canToggle {
		background: var(--buttonBg);

		&:hover {
			background: rgba(0, 0, 0, 0.1);
		}
	}

	&:not(.canToggle) {
		cursor: default;
	}

	&.reacted {
		background: var(--accent);

		&:hover {
			background: var(--accent);
		}

		> .count {
			color: var(--fgOnAccent);
		}

		> .icon {
			filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
		}
	}
}

.count {
	font-size: 0.9em;
	line-height: 32px;
	margin: 0 0 0 4px;
}
</style>

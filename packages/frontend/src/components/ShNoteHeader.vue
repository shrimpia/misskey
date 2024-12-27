<template>
<header :class="$style.root">
	<MkAvatar :class="$style.avatar" :user="note.user" link preview/>
	<div :class="$style.userInfo">
		<div :class="$style.userInfoMain">
			<MkA v-user-preview="note.user.id" :class="$style.name" :to="userPage(note.user)">
				<MkUserName :user="note.user"/>
			</MkA>
			<div :class="$style.userInfoLine">
				<div :class="$style.username"><MkAcct :user="note.user"/></div>
				<div v-if="note.user.isBot" :class="$style.isBot">bot</div>
				<div v-if="note.user.badgeRoles" :class="$style.badgeRoles">
					<img v-for="role in note.user.badgeRoles" :key="role.id" v-tooltip="role.name" :class="$style.badgeRole" :src="role.iconUrl"/>
				</div>
			</div>
		</div>
		<div :class="$style.userInfoSub">
			<div :class="$style.userInfoLine">
				<MkA :to="notePage(note)">
					<MkTime :time="note.createdAt"/>
				</MkA>
				<span v-if="note.visibility !== 'public'" style="margin-left: 0.5em;" :title="i18n.ts._visibility[note.visibility]">
					<i v-if="note.visibility === 'home'" class="ti ti-home"></i>
					<i v-else-if="note.visibility === 'followers'" class="ti ti-lock"></i>
					<i v-else-if="note.visibility === 'specified'" ref="specified" class="ti ti-mail"></i>
				</span>
				<span v-if="note.localOnly" style="margin-left: 0.5em;" :title="i18n.ts._visibility['disableFederation']"><i class="ti ti-rocket-off"></i></span>
				<span v-if="note.channel" style="margin-left: 0.5em;" :title="note.channel.name"><i class="ti ti-device-tv"></i></span>
			</div>
			<MkInstanceTicker v-if="showTicker" :class="$style.ticker" :instance="note.user.instance"/>
		</div>
	</div>
</header>
</template>

<script lang="ts" setup>
import * as misskey from 'misskey-js';
import { i18n } from '@/i18n';
import { notePage } from '@/filters/note';
import { userPage } from '@/filters/user';
import MkInstanceTicker from '@/components/MkInstanceTicker.vue';

defineProps<{
	note: misskey.entities.Note;
	showTicker?: boolean;
	pinned?: boolean;
}>();
</script>

<style lang="scss" module>
.root {
	display: flex;
	margin-bottom: 14px;
}

.avatar {
	display: block !important;
	margin: 0 14px 0 0;
	width: 48px;
	height: 48px;
}

.userInfo {
	width: 0;
	flex-grow: 1;
	line-height: 1.5;
	display: flex;
}

.userInfoMain {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	flex-grow: 1;
	width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	gap: 0.1em 0;
}

.userInfoSub {
	display: flex;
	font-size: 0.9em;
	flex-direction: column;
	align-items: flex-end;
	gap: 0.1em 0;
}

.userInfoLine {
	display: flex;
}

.name {
	flex-shrink: 1;
	display: block;
	width: 100%;
	margin: 0 .5em 0 0;
	padding: 0;
	overflow: hidden;
	font-size: 1em;
	font-weight: bold;
	text-decoration: none;
	text-overflow: ellipsis;

	&:hover {
		text-decoration: underline;
	}
}

.isBot {
	flex-shrink: 0;
	align-self: center;
	margin: 0 .5em 0 0;
	padding: 1px 6px;
	font-size: 80%;
	border: solid 0.5px var(--MI_THEME-divider);
	border-radius: 3px;
}

.username {
	flex-shrink: 9999999;
	margin: 0 .5em 0 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

.info {
	flex-shrink: 0;
	margin-left: auto;
	font-size: 0.9em;
}

.badgeRoles {
	margin: 0 .5em 0 0;
}

.badgeRole {
	height: 1.3em;
	vertical-align: -20%;

	& + .badgeRole {
		margin-left: 0.2em;
	}
}
</style>

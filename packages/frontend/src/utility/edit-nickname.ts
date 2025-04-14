import type { User } from 'misskey-js/entities.js';
import * as os from '@/os';
import { prefer } from '@/preferences';

export async function editNickname(user: User) {
	if (!prefer.s['ebisskey.nicknameEnabled']) return;
	const nicknameMap = { ...prefer.s['ebisskey.nicknameMap'] };
	const { result, canceled } = await os.inputText({
		title: 'ニックネームを編集',
		placeholder: user.name ?? user.username,
		default: nicknameMap[user.id] ?? null,
	});
	if (canceled) return;
	if (result) {
		nicknameMap[user.id] = result;
	} else {
		delete nicknameMap[user.id];
	}
	prefer.commit('ebisskey.nicknameMap', nicknameMap);
}

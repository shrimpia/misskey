/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojiSoundsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { EmojiSoundService } from '@/core/EmojiSoundService.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',
	kind: 'write:admin:emoji-sounds',
	secure: true,

	errors: {
		noSuchEmojiSound: {
			message: 'No such emoji sound.',
			code: 'NO_SUCH_EMOJI_SOUND',
			id: '6c8f7e9e-5d3b-6d9f-0e8e-3f4c5d6e7f8g',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		id: { type: 'string', format: 'misskey:id' },
	},
	required: ['id'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.emojiSoundsRepository)
		private emojiSoundsRepository: EmojiSoundsRepository,

		private emojiSoundService: EmojiSoundService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const emojiSound = await this.emojiSoundsRepository.findOneBy({ id: ps.id });
			if (!emojiSound) {
				throw new ApiError(meta.errors.noSuchEmojiSound);
			}

			await this.emojiSoundService.delete(ps.id, me);
		});
	}
}

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojiSoundsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { EmojiSoundEntityService } from '@/core/entities/EmojiSoundEntityService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',
	kind: 'read:admin:emoji-sounds',
	secure: true,

	res: {
		type: 'array',
		items: {
			type: 'object',
			ref: 'EmojiSound',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.emojiSoundsRepository)
		private emojiSoundsRepository: EmojiSoundsRepository,

		private emojiSoundEntityService: EmojiSoundEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const emojiSounds = await this.emojiSoundsRepository.find({
				order: { createdAt: 'DESC' },
			});

			return await this.emojiSoundEntityService.packMany(emojiSounds);
		});
	}
}

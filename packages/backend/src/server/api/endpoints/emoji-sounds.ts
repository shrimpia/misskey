/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { EmojiSoundService } from '@/core/EmojiSoundService.js';

export const meta = {
	tags: ['emoji'],

	requireCredential: false,

	res: {
		type: 'object',
		additionalProperties: {
			type: 'object',
			properties: {
				url: { type: 'string' },
				volume: { type: 'number' },
			},
			required: ['url', 'volume'],
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
		private emojiSoundService: EmojiSoundService,
	) {
		super(meta, paramDef, async () => {
			return await this.emojiSoundService.packForPublic();
		});
	}
}

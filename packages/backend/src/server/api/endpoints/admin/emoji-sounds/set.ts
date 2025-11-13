/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { EmojiSoundService } from '@/core/EmojiSoundService.js';
import { EmojiSoundEntityService } from '@/core/entities/EmojiSoundEntityService.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',
	kind: 'write:admin:emoji-sounds',
	secure: true,

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: '4a8f6e7e-3b1a-4b7e-8c6d-1f2a3b4c5d6e',
		},
		invalidVolume: {
			message: 'Invalid volume.',
			code: 'INVALID_VOLUME',
			id: '5b9f7e8e-4c2a-5c8e-9d7d-2f3b4c5d6e7f',
		},
	},

	res: {
		type: 'object',
		ref: 'EmojiSound',
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		reaction: { type: 'string', minLength: 1, maxLength: 256 },
		fileId: { type: 'string', format: 'misskey:id' },
		volume: { type: 'number', minimum: 0, maximum: 1, default: 1.0 },
	},
	required: ['reaction', 'fileId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		private emojiSoundService: EmojiSoundService,
		private emojiSoundEntityService: EmojiSoundEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// ファイルの存在確認
			const file = await this.driveFilesRepository.findOneBy({ id: ps.fileId });
			if (!file) {
				throw new ApiError(meta.errors.noSuchFile);
			}

			// 音量の検証
			if (ps.volume !== undefined && (ps.volume < 0 || ps.volume > 1)) {
				throw new ApiError(meta.errors.invalidVolume);
			}

			const emojiSound = await this.emojiSoundService.set({
				reaction: ps.reaction,
				fileId: ps.fileId,
				volume: ps.volume,
			}, me);

			return await this.emojiSoundEntityService.pack(emojiSound);
		});
	}
}

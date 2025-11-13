/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { EmojiSoundsRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import type { Packed } from '@/misc/json-schema.js';
import type { MiEmojiSound } from '@/models/EmojiSound.js';
import { bindThis } from '@/decorators.js';
import { DriveFileEntityService } from './DriveFileEntityService.js';

@Injectable()
export class EmojiSoundEntityService {
	constructor(
		@Inject(DI.emojiSoundsRepository)
		private emojiSoundsRepository: EmojiSoundsRepository,

		private driveFileEntityService: DriveFileEntityService,
	) {
	}

	@bindThis
	public async pack(
		src: MiEmojiSound['id'] | MiEmojiSound,
	): Promise<Packed<'EmojiSound'>> {
		const emojiSound = typeof src === 'object' ? src : await this.emojiSoundsRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: emojiSound.id,
			createdAt: emojiSound.createdAt.toISOString(),
			updatedAt: emojiSound.updatedAt?.toISOString() ?? null,
			reaction: emojiSound.reaction,
			file: this.driveFileEntityService.pack(emojiSound.fileId),
			volume: emojiSound.volume,
		});
	}

	@bindThis
	public async packMany(
		emojiSounds: MiEmojiSound[],
	): Promise<Packed<'EmojiSound'>[]> {
		return Promise.all(emojiSounds.map(x => this.pack(x)));
	}
}

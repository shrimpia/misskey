/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import type { EmojiSoundsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import type { MiUser } from '@/models/User.js';
import type { MiEmojiSound } from '@/models/EmojiSound.js';
import { bindThis } from '@/decorators.js';
import { RedisSingleCache } from '@/misc/cache.js';
import { EmojiSoundEntityService } from '@/core/entities/EmojiSoundEntityService.js';

@Injectable()
export class EmojiSoundService {
	private cache: RedisSingleCache<Map<string, MiEmojiSound>>;

	constructor(
		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		@Inject(DI.emojiSoundsRepository)
		private emojiSoundsRepository: EmojiSoundsRepository,

		private idService: IdService,
		private emojiSoundEntityService: EmojiSoundEntityService,
		private globalEventService: GlobalEventService,
		private moderationLogService: ModerationLogService,
	) {
		this.cache = new RedisSingleCache<Map<string, MiEmojiSound>>(this.redisClient, 'emojiSounds', {
			lifetime: 1000 * 60 * 30, // 30分
			memoryCacheLifetime: 1000 * 60 * 5, // 5分
			fetcher: () => this.emojiSoundsRepository.find().then(emojiSounds =>
				new Map(emojiSounds.map(es => [es.reaction, es])),
			),
			toRedisConverter: (value) => JSON.stringify(Array.from(value.values())),
			fromRedisConverter: (value) => {
				const parsed = JSON.parse(value);
				return new Map(parsed.map((x: any) => [x.reaction, {
					...x,
					createdAt: new Date(x.createdAt),
					updatedAt: x.updatedAt ? new Date(x.updatedAt) : null,
				}]));
			},
		});
	}

	@bindThis
	public async set(params: {
		reaction: string;
		fileId: string;
		volume?: number;
	}, moderator: MiUser): Promise<MiEmojiSound> {
		const volume = params.volume ?? 1.0;

		// 既存のものがあるか確認
		const existing = await this.emojiSoundsRepository.findOneBy({ reaction: params.reaction });
		let emojiSound: MiEmojiSound;

		if (existing) {
			// 更新
			await this.emojiSoundsRepository.update(existing.id, {
				fileId: params.fileId,
				volume: volume,
				updatedAt: new Date(),
			});
			emojiSound = await this.emojiSoundsRepository.findOneByOrFail({ id: existing.id });
		} else {
			// 新規作成
			emojiSound = await this.emojiSoundsRepository.insertOne({
				id: this.idService.gen(),
				reaction: params.reaction,
				fileId: params.fileId,
				volume: volume,
				createdAt: new Date(),
				updatedAt: null,
			});
		}

		// キャッシュ更新
		this.cache.refresh();

		// グローバルイベント発行
		this.globalEventService.publishBroadcastStream('emojiSoundUpdated', {
			emojiSounds: [await this.emojiSoundEntityService.pack(emojiSound)],
		});

		// モデレーションログ
		this.moderationLogService.log(moderator, existing ? 'emojiSoundUpdated' : 'emojiSoundCreated', {
			emojiSoundId: emojiSound.id,
			reaction: emojiSound.reaction,
			fileId: emojiSound.fileId,
			volume: emojiSound.volume,
		});

		return emojiSound;
	}

	@bindThis
	public async delete(id: string, moderator: MiUser): Promise<void> {
		const emojiSound = await this.emojiSoundsRepository.findOneByOrFail({ id });

		await this.emojiSoundsRepository.delete(id);

		// キャッシュ更新
		this.cache.refresh();

		// グローバルイベント発行
		this.globalEventService.publishBroadcastStream('emojiSoundDeleted', {
			reaction: emojiSound.reaction,
		});

		// モデレーションログ
		this.moderationLogService.log(moderator, 'emojiSoundDeleted', {
			emojiSoundId: emojiSound.id,
			reaction: emojiSound.reaction,
		});
	}

	@bindThis
	public async list(): Promise<MiEmojiSound[]> {
		return await this.emojiSoundsRepository.find({
			order: { createdAt: 'DESC' },
		});
	}

	@bindThis
	public async getByReaction(reaction: string): Promise<MiEmojiSound | null> {
		const cache = await this.cache.fetch();
		return cache.get(reaction) ?? null;
	}

	@bindThis
	public async packForPublic(): Promise<Record<string, { url: string; volume: number }>> {
		const emojiSounds = await this.emojiSoundsRepository.find({
			relations: ['file'],
		});
		const result: Record<string, { url: string; volume: number }> = {};

		for (const emojiSound of emojiSounds) {
			if (emojiSound.file) {
				result[emojiSound.reaction] = {
					url: emojiSound.file.url,
					volume: emojiSound.volume,
				};
			}
		}

		return result;
	}
}

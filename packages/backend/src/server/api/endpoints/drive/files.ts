/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { IdService } from '@/core/IdService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'read:drive',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'DriveFile',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		sinceDate: { type: 'integer' },
		untilDate: { type: 'integer' },
		folderId: { type: 'string', format: 'misskey:id', nullable: true, default: null },
		type: { type: 'string', nullable: true, pattern: /^[a-zA-Z\/\-*]+$/.toString().slice(1, -1) },
		sort: { type: 'string', nullable: true, enum: ['+createdAt', '-createdAt', '+name', '-name', '+size', '-size', null] },
		// #region shrimpia 登録日範囲での絞り込み
		createdAtFrom: { type: 'integer', nullable: true },
		createdAtUntil: { type: 'integer', nullable: true },
		// #endregion
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		private driveFileEntityService: DriveFileEntityService,
		private queryService: QueryService,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.driveFilesRepository.createQueryBuilder('file'), ps.sinceId, ps.untilId, ps.sinceDate, ps.untilDate)
				.andWhere('file.userId = :userId', { userId: me.id });

			if (ps.folderId) {
				query.andWhere('file.folderId = :folderId', { folderId: ps.folderId });
			} else {
				query.andWhere('file.folderId IS NULL');
			}

			// #region shrimpia 登録日範囲での絞り込み（カーソルとは独立して両端を保持）
			if (ps.createdAtFrom) {
				query.andWhere('file.id > :createdAtFromId', { createdAtFromId: this.idService.gen(ps.createdAtFrom) });
			}
			if (ps.createdAtUntil) {
				query.andWhere('file.id < :createdAtUntilId', { createdAtUntilId: this.idService.gen(ps.createdAtUntil) });
			}
			// #endregion

			if (ps.type) {
				// #region shrimpia 「その他」= 画像/動画/音声以外
				if (ps.type === 'other') {
					query.andWhere('file.type NOT LIKE :otherImg', { otherImg: 'image/%' })
						.andWhere('file.type NOT LIKE :otherVid', { otherVid: 'video/%' })
						.andWhere('file.type NOT LIKE :otherAud', { otherAud: 'audio/%' });
				} else
				// #endregion
					if (ps.type.endsWith('/*')) {
						query.andWhere('file.type like :type', { type: ps.type.replace('/*', '/') + '%' });
					} else {
						query.andWhere('file.type = :type', { type: ps.type });
					}
			}

			switch (ps.sort) {
				case '+createdAt': query.orderBy('file.id', 'DESC'); break;
				case '-createdAt': query.orderBy('file.id', 'ASC'); break;
				case '+name': query.orderBy('file.name', 'DESC'); break;
				case '-name': query.orderBy('file.name', 'ASC'); break;
				case '+size': query.orderBy('file.size', 'DESC'); break;
				case '-size': query.orderBy('file.size', 'ASC'); break;
			}

			const files = await query.limit(ps.limit).getMany();

			return await this.driveFileEntityService.packMany(files, { detail: false, self: true });
		});
	}
}

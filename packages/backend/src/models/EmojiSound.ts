/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiDriveFile } from './DriveFile.js';

@Entity('emoji_sound')
export class MiEmojiSound {
	@PrimaryColumn(id())
	public id: string;

	@Column('timestamp with time zone', {
		default: () => 'CURRENT_TIMESTAMP',
	})
	public createdAt: Date;

	@Column('timestamp with time zone', {
		nullable: true,
	})
	public updatedAt: Date | null;

	@Index({ unique: true })
	@Column('varchar', {
		length: 256,
	})
	public reaction: string;

	@Index()
	@Column(id())
	public fileId: MiDriveFile['id'];

	@ManyToOne(type => MiDriveFile, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public file: MiDriveFile | null;

	@Column('float', {
		default: 1.0,
	})
	public volume: number;
}

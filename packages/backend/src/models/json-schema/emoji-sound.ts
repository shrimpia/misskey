/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const packedEmojiSoundSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			optional: false, nullable: false,
			format: 'id',
		},
		createdAt: {
			type: 'string',
			optional: false, nullable: false,
			format: 'date-time',
		},
		updatedAt: {
			type: 'string',
			optional: false, nullable: true,
			format: 'date-time',
		},
		reaction: {
			type: 'string',
			optional: false, nullable: false,
		},
		file: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'DriveFile',
		},
		volume: {
			type: 'number',
			optional: false, nullable: false,
		},
	},
} as const;

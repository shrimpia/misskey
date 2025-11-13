/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddEmojiSound1760800000000 {
	name = 'AddEmojiSound1760800000000'

	/**
	 * @param {import('typeorm').QueryRunner} queryRunner
	 */
	async up(queryRunner) {
		await queryRunner.query(`CREATE TABLE "emoji_sound" ("id" character varying(32) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP WITH TIME ZONE, "reaction" character varying(256) NOT NULL, "fileId" character varying(32) NOT NULL, "volume" double precision NOT NULL DEFAULT '1', CONSTRAINT "PK_emoji_sound_id" PRIMARY KEY ("id"))`);
		await queryRunner.query(`CREATE UNIQUE INDEX "IDX_emoji_sound_reaction" ON "emoji_sound" ("reaction") `);
		await queryRunner.query(`CREATE INDEX "IDX_emoji_sound_fileId" ON "emoji_sound" ("fileId") `);
		await queryRunner.query(`ALTER TABLE "emoji_sound" ADD CONSTRAINT "FK_emoji_sound_fileId" FOREIGN KEY ("fileId") REFERENCES "drive_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
	}

	/**
	 * @param {import('typeorm').QueryRunner} queryRunner
	 */
	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "emoji_sound" DROP CONSTRAINT "FK_emoji_sound_fileId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_emoji_sound_fileId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_emoji_sound_reaction"`);
		await queryRunner.query(`DROP TABLE "emoji_sound"`);
	}
}

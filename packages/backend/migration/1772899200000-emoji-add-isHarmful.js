/*
 * SPDX-FileCopyrightText: shrimpia and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class EmojiAddIsHarmful1772899200000 {
    name = 'EmojiAddIsHarmful1772899200000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "emoji" ADD "isHarmful" boolean NOT NULL DEFAULT false`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "emoji" DROP COLUMN "isHarmful"`);
    }
}

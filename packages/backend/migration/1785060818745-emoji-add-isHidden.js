/*
 * SPDX-FileCopyrightText: shrimpia and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class EmojiAddIsHidden1785060818745 {
    name = 'EmojiAddIsHidden1785060818745'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "emoji" ADD "isHidden" boolean NOT NULL DEFAULT false`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "emoji" DROP COLUMN "isHidden"`);
    }
}

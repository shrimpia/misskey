/*
 * SPDX-FileCopyrightText: shrimpia and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NoteAddAllowHarmfulReaction1772899201000 {
    name = 'NoteAddAllowHarmfulReaction1772899201000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note" ADD "allowHarmfulReaction" boolean NOT NULL DEFAULT true`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note" DROP COLUMN "allowHarmfulReaction"`);
    }
}

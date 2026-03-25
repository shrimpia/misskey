export class MetaAddSpamPrevention1772899202000 {
	name = 'MetaAddSpamPrevention1772899202000';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN "spamUrlPatterns" character varying(1024)[] NOT NULL DEFAULT '{}'`);
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN "spamUrlWindowSize" integer NOT NULL DEFAULT 10`);
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN "spamUrlThreshold" integer NOT NULL DEFAULT 5`);
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN "spamRenoteWindowSize" integer NOT NULL DEFAULT 10`);
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN "spamRenoteThreshold" integer NOT NULL DEFAULT 5`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "spamRenoteThreshold"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "spamRenoteWindowSize"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "spamUrlThreshold"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "spamUrlWindowSize"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "spamUrlPatterns"`);
	}
}

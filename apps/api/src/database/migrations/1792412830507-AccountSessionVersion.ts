import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountSessionVersion1792412830507 implements MigrationInterface {
  name = 'AccountSessionVersion1792412830507';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD "session_version" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP COLUMN "session_version"`,
    );
  }
}

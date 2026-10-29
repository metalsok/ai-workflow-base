import type { MigrationInterface, QueryRunner } from 'typeorm';
export class PersonalLibrary1792409963460 implements MigrationInterface {
  name = 'PersonalLibrary1792409963460';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "library_entries" ("account_id" uuid NOT NULL, "game_id" bigint NOT NULL, "status" text NOT NULL, CONSTRAINT "library_entries_status_check" CHECK ("status" IN (\'want-to-play\', \'playing\', \'completed\', \'stopped-playing\')), CONSTRAINT "library_entries_pkey" PRIMARY KEY ("account_id", "game_id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_account_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_game_fk" FOREIGN KEY ("game_id") REFERENCES "catalog_games"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "library_entries" DROP CONSTRAINT "library_entries_game_fk"',
    );
    await queryRunner.query(
      'ALTER TABLE "library_entries" DROP CONSTRAINT "library_entries_account_fk"',
    );
    await queryRunner.query('DROP TABLE "library_entries"');
  }
}

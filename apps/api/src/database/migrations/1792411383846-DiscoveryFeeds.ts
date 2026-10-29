import type { MigrationInterface, QueryRunner } from 'typeorm';
export class DiscoveryFeeds1792411383846 implements MigrationInterface {
  name = 'DiscoveryFeeds1792411383846';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "catalog_feeds" ("kind" text NOT NULL, "payload" jsonb NOT NULL, "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "catalog_feeds_pkey" PRIMARY KEY ("kind"))',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "catalog_feeds"');
  }
}

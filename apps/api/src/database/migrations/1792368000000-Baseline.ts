import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1792368000000 implements MigrationInterface {
  name = 'Baseline1792368000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" text NOT NULL, "password_hash" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "accounts_email_key" UNIQUE ("email"), CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sessions" ("sid" character varying NOT NULL, "sess" json NOT NULL, "expire" TIMESTAMP(6) NOT NULL, CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "sessions_expire_idx" ON "sessions"  ("expire") `,
    );
    await queryRunner.query(
      `CREATE TABLE "authentication_attempts" ("key" text NOT NULL, "attempts" integer NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "authentication_attempts_pkey" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "authentication_attempts_expiry_idx" ON "authentication_attempts"  ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog_games" ("id" bigint NOT NULL, "metadata" jsonb NOT NULL, "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL, "eligible" boolean NOT NULL DEFAULT true, CONSTRAINT "catalog_games_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog_searches" ("cache_key" text NOT NULL, "payload" jsonb NOT NULL, "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "catalog_searches_pkey" PRIMARY KEY ("cache_key"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "catalog_searches_fetched_at_idx" ON "catalog_searches"  ("fetched_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog_request_limits" ("account_id" uuid NOT NULL, "attempts" integer NOT NULL, "window_end" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "catalog_request_limits_pkey" PRIMARY KEY ("account_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "schema_migrations" ("name" text NOT NULL, "checksum" text NOT NULL, "applied_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("name"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_request_limits" ADD CONSTRAINT "catalog_request_limits_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog_request_limits" DROP CONSTRAINT "catalog_request_limits_account_id_fkey"`,
    );
    await queryRunner.query(`DROP TABLE "schema_migrations"`);
    await queryRunner.query(`DROP TABLE "catalog_request_limits"`);
    await queryRunner.query(
      `DROP INDEX "public"."catalog_searches_fetched_at_idx"`,
    );
    await queryRunner.query(`DROP TABLE "catalog_searches"`);
    await queryRunner.query(`DROP TABLE "catalog_games"`);
    await queryRunner.query(
      `DROP INDEX "public"."authentication_attempts_expiry_idx"`,
    );
    await queryRunner.query(`DROP TABLE "authentication_attempts"`);
    await queryRunner.query(`DROP INDEX "public"."sessions_expire_idx"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
  }
}

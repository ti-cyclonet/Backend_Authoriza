import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessSectorToContract1738900000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contract" 
      ADD COLUMN "businessSector" VARCHAR(50) DEFAULT 'general';
    `);

    // Actualizar manualmente el contrato conocido
    await queryRunner.query(`
      UPDATE "contract" 
      SET "businessSector" = 'restaurant' 
      WHERE "id" = (SELECT "id" FROM "contract" LIMIT 1);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contract" 
      DROP COLUMN "businessSector";
    `);
  }
}
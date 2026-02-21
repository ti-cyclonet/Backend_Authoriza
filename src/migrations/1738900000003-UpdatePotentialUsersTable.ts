import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePotentialUsersTable1738900000003 implements MigrationInterface {
  name = 'UpdatePotentialUsersTable1738900000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE potential_users 
      DROP COLUMN IF EXISTS basic_data_id,
      DROP COLUMN IF EXISTS document_type_id,
      ADD COLUMN IF NOT EXISTS document_type VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE potential_users 
      ADD COLUMN IF NOT EXISTS basic_data_id INTEGER,
      ADD COLUMN IF NOT EXISTS document_type_id INTEGER,
      DROP COLUMN IF EXISTS document_type
    `);
  }
}
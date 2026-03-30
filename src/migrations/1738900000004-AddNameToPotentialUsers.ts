import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameToPotentialUsers1738900000004 implements MigrationInterface {
  name = 'AddNameToPotentialUsers1738900000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE potential_users 
      ADD COLUMN IF NOT EXISTS name VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE potential_users 
      DROP COLUMN IF EXISTS name
    `);
  }
}
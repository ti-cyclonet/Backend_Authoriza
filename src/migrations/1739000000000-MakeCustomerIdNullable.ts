import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCustomerIdNullable1739000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_parameters_periods" 
      ALTER COLUMN "customer_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_parameters_periods" 
      ALTER COLUMN "customer_id" SET NOT NULL
    `);
  }
}

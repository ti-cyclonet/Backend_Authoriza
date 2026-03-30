import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDependentOnIdFromUser1756829474482 implements MigrationInterface {
  name = 'RemoveDependentOnIdFromUser1756829474482';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la foreign key constraint primero
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_dependentOnId"`);
    
    // Eliminar la columna dependentOnId
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "dependentOnId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recrear la columna en caso de rollback
    await queryRunner.query(`ALTER TABLE "user" ADD "dependentOnId" uuid`);
    
    // Recrear la foreign key constraint
    await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_user_dependentOnId" FOREIGN KEY ("dependentOnId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }
}
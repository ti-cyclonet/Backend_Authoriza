import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRolIdFromUser1756829474483 implements MigrationInterface {
  name = 'RemoveRolIdFromUser1756829474483';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la foreign key constraint primero
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_rolId"`);
    
    // Eliminar la columna rolId
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "rolId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recrear la columna en caso de rollback
    await queryRunner.query(`ALTER TABLE "user" ADD "rolId" uuid`);
    
    // Recrear la foreign key constraint
    await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_user_rolId" FOREIGN KEY ("rolId") REFERENCES "rol"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }
}
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountOwnerRole1738900000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Buscar la aplicación Authoriza
    const application = await queryRunner.query(
      `SELECT id FROM application WHERE "strName" = 'Authoriza' LIMIT 1`
    );

    if (application.length > 0) {
      const appId = application[0].id;

      // Verificar si el rol ya existe
      const existingRole = await queryRunner.query(
        `SELECT id FROM rol WHERE "strName" = 'accountOwner' LIMIT 1`
      );

      if (existingRole.length === 0) {
        // Crear el rol accountOwner
        await queryRunner.query(
          `INSERT INTO rol ("strName", "strDescription1", "strDescription2", "strApplicationId", "code") 
           VALUES ('accountOwner', 'Propietario de cuenta', 'Usuario principal que gestiona contratos y facturación', $1, 'ROL-OWNER')`,
          [appId]
        );
        console.log('✅ Rol accountOwner creado');
      } else {
        console.log('⚠️ Rol accountOwner ya existe');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM rol WHERE "strName" = 'accountOwner'`);
  }
}

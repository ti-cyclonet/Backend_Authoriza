import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAdminAuthorizaAccounts1738900000000 implements MigrationInterface {
    name = 'UpdateAdminAuthorizaAccounts1738900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Actualizar la configuración del paquete para adminAuthoriza
        await queryRunner.query(`
            UPDATE configuration_package 
            SET total_account = 2 
            WHERE package_id IN (
                SELECT id FROM package WHERE name = 'Cyclon Plus [+]'
            ) 
            AND rol_id IN (
                SELECT id FROM rol WHERE str_name = 'adminAuthoriza'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir el cambio
        await queryRunner.query(`
            UPDATE configuration_package 
            SET total_account = 1 
            WHERE package_id IN (
                SELECT id FROM package WHERE name = 'Cyclon Plus [+]'
            ) 
            AND rol_id IN (
                SELECT id FROM rol WHERE str_name = 'adminAuthoriza'
            )
        `);
    }
}
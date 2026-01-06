import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ReplaceAppliesToInvoicesWithValue1704067600000 implements MigrationInterface {
    name = 'ReplaceAppliesToInvoicesWithValue1704067600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Eliminar columna applies_to_invoices
        await queryRunner.dropColumn('global_parameters_for_invoices', 'applies_to_invoices');
        
        // Agregar columna value
        await queryRunner.addColumn('global_parameters_for_invoices', new TableColumn({
            name: 'value',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: '0.00'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar columna value
        await queryRunner.dropColumn('global_parameters_for_invoices', 'value');
        
        // Recrear columna applies_to_invoices
        await queryRunner.addColumn('global_parameters_for_invoices', new TableColumn({
            name: 'applies_to_invoices',
            type: 'boolean',
            default: true,
            isNullable: false,
        }));
    }
}
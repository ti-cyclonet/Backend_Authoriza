import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOperationTypeToGlobalParametersForInvoices1704067400000 implements MigrationInterface {
    name = 'AddOperationTypeToGlobalParametersForInvoices1704067400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('global_parameters_for_invoices');
        const columnExists = table?.findColumnByName('operation_type');
        
        if (!columnExists) {
            await queryRunner.addColumn('global_parameters_for_invoices', new TableColumn({
                name: 'operation_type',
                type: 'varchar',
                length: '10',
                default: "'add'",
                isNullable: false,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('global_parameters_for_invoices', 'operation_type');
    }
}
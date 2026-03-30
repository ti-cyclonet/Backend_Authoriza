import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGlobalParametersToInvoices1704067200000 implements MigrationInterface {
    name = 'AddGlobalParametersToInvoices1704067200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar columnas para parámetros globales
        await queryRunner.addColumns('invoices', [
            new TableColumn({
                name: 'iva',
                type: 'decimal',
                precision: 5,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: 'profit_margin',
                type: 'decimal',
                precision: 5,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: 'financing_interest',
                type: 'decimal',
                precision: 5,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: 'global_discount',
                type: 'decimal',
                precision: 5,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: 'late_fee_penalty',
                type: 'decimal',
                precision: 5,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: 'BLACK_FRIDAY_DISCOUNT',
                type: 'decimal',
                precision: 5,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: 'RTE_FUENTE',
                type: 'decimal',
                precision: 5,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: 'currency',
                type: 'varchar',
                length: '10',
                isNullable: true,
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar columnas de parámetros globales
        await queryRunner.dropColumns('invoices', [
            'iva',
            'profit_margin', 
            'financing_interest',
            'global_discount',
            'late_fee_penalty',
            'BLACK_FRIDAY_DISCOUNT',
            'RTE_FUENTE',
            'currency'
        ]);
    }
}
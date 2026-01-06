import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ReplaceGlobalParametersWithJson1704067300000 implements MigrationInterface {
    name = 'ReplaceGlobalParametersWithJson1704067300000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar si la columna globalParameters ya existe
        const hasGlobalParameters = await queryRunner.hasColumn('invoices', 'globalParameters');
        
        // Eliminar columnas individuales de parámetros globales
        const columnsToRemove = [
            'iva', 'profit_margin', 'financing_interest', 'global_discount',
            'late_fee_penalty', 'BLACK_FRIDAY_DISCOUNT', 'RTE_FUENTE', 'currency'
        ];

        for (const column of columnsToRemove) {
            try {
                const hasColumn = await queryRunner.hasColumn('invoices', column);
                if (hasColumn) {
                    await queryRunner.dropColumn('invoices', column);
                }
            } catch (error) {
                console.log(`Error dropping column ${column}:`, error.message);
            }
        }

        // Agregar campo JSON para parámetros globales solo si no existe
        if (!hasGlobalParameters) {
            await queryRunner.addColumn('invoices', new TableColumn({
                name: 'globalParameters',
                type: 'jsonb',
                isNullable: true,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar campo JSON
        await queryRunner.dropColumn('invoices', 'globalParameters');

        // Recrear columnas individuales
        const columnsToAdd = [
            { name: 'iva', type: 'decimal', precision: 5, scale: 2 },
            { name: 'profit_margin', type: 'decimal', precision: 5, scale: 2 },
            { name: 'financing_interest', type: 'decimal', precision: 5, scale: 2 },
            { name: 'global_discount', type: 'decimal', precision: 5, scale: 2 },
            { name: 'late_fee_penalty', type: 'decimal', precision: 5, scale: 2 },
            { name: 'BLACK_FRIDAY_DISCOUNT', type: 'decimal', precision: 5, scale: 2 },
            { name: 'RTE_FUENTE', type: 'decimal', precision: 5, scale: 2 },
            { name: 'currency', type: 'varchar', length: '10' }
        ];

        for (const col of columnsToAdd) {
            await queryRunner.addColumn('invoices', new TableColumn({
                name: col.name,
                type: col.type,
                precision: col.precision,
                scale: col.scale,
                length: col.length,
                isNullable: true,
            }));
        }
    }
}
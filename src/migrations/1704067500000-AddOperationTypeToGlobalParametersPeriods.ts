import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOperationTypeToGlobalParametersPeriods1704067500000 implements MigrationInterface {
    name = 'AddOperationTypeToGlobalParametersPeriods1704067500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('global_parameters_periods', 'operation_type');
        if (!hasColumn) {
            await queryRunner.addColumn('global_parameters_periods', new TableColumn({
                name: 'operation_type',
                type: 'varchar',
                length: '10',
                default: "'add'",
                isNullable: false,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('global_parameters_periods', 'operation_type');
    }
}
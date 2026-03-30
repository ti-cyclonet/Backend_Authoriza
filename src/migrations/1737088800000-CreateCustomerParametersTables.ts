import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateCustomerParametersTables1737088800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCustomerParametersTable = await queryRunner.hasTable('customer_parameters');
    if (!hasCustomerParametersTable) {
      await queryRunner.createTable(
        new Table({
          name: 'customer_parameters',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'tenant_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'code',
              type: 'varchar',
              length: '100',
            },
            {
              name: 'name',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'data_type',
              type: 'varchar',
              length: '50',
            },
            {
              name: 'default_value',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );
    }

    const hasCustomerParametersPeriodsTable = await queryRunner.hasTable('customer_parameters_periods');
    if (!hasCustomerParametersPeriodsTable) {
      await queryRunner.createTable(
        new Table({
          name: 'customer_parameters_periods',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'customer_parameter_id',
              type: 'uuid',
            },
            {
              name: 'period_id',
              type: 'uuid',
            },
            {
              name: 'value',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'status',
              type: 'varchar',
              length: '20',
              default: "'active'",
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'customer_parameters_periods',
        new TableForeignKey({
          columnNames: ['customer_parameter_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'customer_parameters',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customer_parameters_periods');
    await queryRunner.dropTable('customer_parameters');
  }
}
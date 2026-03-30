import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTenantIdToCustomerParameters1737090000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('customer_parameters', 'tenant_id');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'customer_parameters',
        new TableColumn({
          name: 'tenant_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('customer_parameters', 'tenant_id');
  }
}

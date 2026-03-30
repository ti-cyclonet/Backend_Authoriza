import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTenantIdToPeriods1737089000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('periods', 'tenant_id');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'periods',
        new TableColumn({
          name: 'tenant_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('periods', 'tenant_id');
  }
}
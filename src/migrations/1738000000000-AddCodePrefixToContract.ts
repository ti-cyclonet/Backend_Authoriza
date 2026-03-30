import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCodePrefixToContract1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('contract');
    const columnExists = table?.findColumnByName('codePrefix');
    
    if (!columnExists) {
      await queryRunner.addColumn(
        'contract',
        new TableColumn({
          name: 'codePrefix',
          type: 'varchar',
          length: '3',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('contract', 'codePrefix');
  }
}

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCodePrefixToContract1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('contract', 'codePrefix');
  }
}

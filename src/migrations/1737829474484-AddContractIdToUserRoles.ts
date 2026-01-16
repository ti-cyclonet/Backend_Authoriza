import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddContractIdToUserRoles1737829474484 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user_roles',
      new TableColumn({
        name: 'contractId',
        type: 'uuid',
        isNullable: true,
      })
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['contractId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contracts',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_roles');
    const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('contractId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('user_roles', foreignKey);
    }
    await queryRunner.dropColumn('user_roles', 'contractId');
  }
}

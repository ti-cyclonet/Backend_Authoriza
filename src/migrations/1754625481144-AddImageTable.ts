import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddImageTable1754625481144 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'image',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'fileName', type: 'varchar' },
          { name: 'url', type: 'varchar' },
          { name: 'packageId', type: 'uuid' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'image',
      new TableForeignKey({
        columnNames: ['packageId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'package',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('image');
  }
}

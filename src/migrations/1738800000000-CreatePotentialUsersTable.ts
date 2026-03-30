import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePotentialUsersTable1738800000000 implements MigrationInterface {
  name = 'CreatePotentialUsersTable1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('potential_users');
    
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'potential_users',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'source_application',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'basic_data_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'document_type_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'document_number',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['POTENTIAL', 'CONVERTED'],
              default: "'POTENTIAL'",
            },
            {
              name: 'converted_to_user_id',
              type: 'int',
              isNullable: true,
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
          foreignKeys: [],
        }),
        true,
      );
    }

    try {
      await queryRunner.createIndex(
        'potential_users',
        new TableIndex({
          name: 'IDX_potential_users_email',
          columnNames: ['email']
        })
      );
    } catch (error) {
      // Index already exists, ignore
    }

    try {
      await queryRunner.createIndex(
        'potential_users',
        new TableIndex({
          name: 'IDX_potential_users_source',
          columnNames: ['source_application']
        })
      );
    } catch (error) {
      // Index already exists, ignore
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('potential_users');
  }
}
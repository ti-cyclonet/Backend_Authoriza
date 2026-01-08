import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDocumentTypesTable1756829474481 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'document_types',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'document_type',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'dtm_creation_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'dtm_latest_update_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Insertar tipos de documento del catálogo
    await queryRunner.query(`
      INSERT INTO document_types (id, description, document_type) VALUES
      (uuid_generate_v4(), 'Cédula de ciudadanía', 'CC'),
      (uuid_generate_v4(), 'Cédula de extranjería', 'CE'),
      (uuid_generate_v4(), 'Pasaporte', 'PP'),
      (uuid_generate_v4(), 'Tarjeta de identidad', 'TI'),
      (uuid_generate_v4(), 'Nit', 'NIT')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('document_types');
  }
}
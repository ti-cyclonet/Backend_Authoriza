import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Descuento (%) solo para la primera factura de un contrato. Lo usa Kiri para
 * los invitados por un amigo: 50% en el primer mes de KIRI PLUS o 30% en
 * KIRI PRO (ver invoice-generator.service.ts).
 */
export class AddFirstInvoiceDiscountToContract1790800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('contract', 'firstInvoiceDiscountPct'))) {
      await queryRunner.addColumn('contract', new TableColumn({
        name: 'firstInvoiceDiscountPct',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('contract', 'firstInvoiceDiscountPct')) {
      await queryRunner.dropColumn('contract', 'firstInvoiceDiscountPct');
    }
  }
}

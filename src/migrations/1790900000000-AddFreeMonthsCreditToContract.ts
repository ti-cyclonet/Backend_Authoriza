import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Meses gratis acumulados en un contrato. Lo usa Kiri para premiar a quien
 * invita amigos y ya paga su plan: "1 mes gratis de tu plan" (ver
 * invoice-generator.service.ts y ContractService.addFreeMonths).
 */
export class AddFreeMonthsCreditToContract1790900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('contract', 'freeMonthsCredit'))) {
      await queryRunner.addColumn('contract', new TableColumn({
        name: 'freeMonthsCredit',
        type: 'int',
        default: 0,
        isNullable: false,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('contract', 'freeMonthsCredit')) {
      await queryRunner.dropColumn('contract', 'freeMonthsCredit');
    }
  }
}

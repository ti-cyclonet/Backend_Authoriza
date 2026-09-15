import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * La tabla `periods` es compartida entre FactoNet e InOut y hasta ahora solo
 * se aislaba por tenant_id. Cuando el tenant del admin de FactoNet coincidio
 * con el tenant de un usuario de InOut, InOut pudo ver y anidar periodos de
 * FactoNet como si fueran propios (caso real: subperiodo "amor y amistad"
 * creado desde InOut como hijo del periodo "2026" de FactoNet).
 *
 * Esta migracion agrega `source` ('FACTONET' | 'INOUT') y reclasifica/corrige
 * los 3 registros de produccion conocidos a la fecha de este cambio.
 */
export class AddSourceToPeriods1789430400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('periods', 'source');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'periods',
        new TableColumn({
          name: 'source',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // Periodo anual "2026" (PE00001) creado por el administrador de FactoNet.
    await queryRunner.query(
      `UPDATE periods SET source = 'FACTONET' WHERE id = '70d8cffd-d1fd-4ce4-a0ba-42bcd908827a'`,
    );

    // Subperiodo "amor y amistad" creado en realidad desde InOut, pero quedo
    // anidado como hijo del periodo de FactoNet por la falta de aislamiento
    // por app. Se reclasifica como INOUT y se desanida (pasa a ser un periodo
    // propio de InOut, igual que "Temporada 2").
    await queryRunner.query(
      `UPDATE periods SET source = 'INOUT', "parentPeriodId" = NULL WHERE id = '00bc7f45-4c22-4b2a-843d-f15591a31281'`,
    );

    // "Temporada 2" (PE00003), periodo de InOut.
    await queryRunner.query(
      `UPDATE periods SET source = 'INOUT' WHERE id = '02a2dd75-4b58-4a0b-b4d0-619c4dfc0aaf'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('periods', 'source');
  }
}

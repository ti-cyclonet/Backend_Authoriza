import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEntityCodes1756829474480 implements MigrationInterface {
    name = 'AddEntityCodes1756829474480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable('entity_codes');
        if (hasTable) {
            console.log('entity_codes table already exists, skipping migration');
            return;
        }
        
        await queryRunner.query(`
            CREATE TABLE "entity_codes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "entityType" character varying NOT NULL,
                "prefix" character varying NOT NULL,
                "currentNumber" integer NOT NULL DEFAULT '0',
                "digitLength" integer NOT NULL DEFAULT '5',
                CONSTRAINT "UQ_entity_codes_entityType" UNIQUE ("entityType"),
                CONSTRAINT "PK_entity_codes" PRIMARY KEY ("id")
            )
        `);

        // Add code columns to existing tables
        await queryRunner.query(`ALTER TABLE "user" ADD "code" character varying`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "code" character varying`);
        await queryRunner.query(`ALTER TABLE "contract" ADD "code" character varying`);
        await queryRunner.query(`ALTER TABLE "package" ADD "code" character varying`);
        await queryRunner.query(`ALTER TABLE "application" ADD "code" character varying`);
        await queryRunner.query(`ALTER TABLE "period" ADD "code" character varying`);
        await queryRunner.query(`ALTER TABLE "rol" ADD "code" character varying`);

        // Add unique constraints
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_user_code" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "UQ_invoices_code" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "contract" ADD CONSTRAINT "UQ_contract_code" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "package" ADD CONSTRAINT "UQ_package_code" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "application" ADD CONSTRAINT "UQ_application_code" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "period" ADD CONSTRAINT "UQ_period_code" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "rol" ADD CONSTRAINT "UQ_rol_code" UNIQUE ("code")`);

        // Initialize entity codes
        await queryRunner.query(`
            INSERT INTO "entity_codes" ("entityType", "prefix", "currentNumber", "digitLength") VALUES
            ('User', 'CU', 0, 5),
            ('Invoice', 'DF', 0, 5),
            ('Contract', 'DC', 0, 5),
            ('Package', 'DP', 0, 5),
            ('Application', 'AP', 0, 5),
            ('Period', 'PE', 0, 5),
            ('Rol', 'RO', 0, 5)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rol" DROP CONSTRAINT "UQ_rol_code"`);
        await queryRunner.query(`ALTER TABLE "period" DROP CONSTRAINT "UQ_period_code"`);
        await queryRunner.query(`ALTER TABLE "application" DROP CONSTRAINT "UQ_application_code"`);
        await queryRunner.query(`ALTER TABLE "package" DROP CONSTRAINT "UQ_package_code"`);
        await queryRunner.query(`ALTER TABLE "contract" DROP CONSTRAINT "UQ_contract_code"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "UQ_invoices_code"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_user_code"`);
        
        await queryRunner.query(`ALTER TABLE "rol" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "period" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "application" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "package" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "contract" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "code"`);
        
        await queryRunner.query(`DROP TABLE "entity_codes"`);
    }
}
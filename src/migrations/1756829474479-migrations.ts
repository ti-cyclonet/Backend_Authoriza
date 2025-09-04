import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1756829474479 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            -- Applications
            CREATE TABLE applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "strName" TEXT UNIQUE NOT NULL,
                "strDescription" TEXT,
                "strUrlImage" TEXT DEFAULT '/assets/img/default.jpg',
                "strSlug" TEXT UNIQUE NOT NULL,
                "strTags" TEXT[] DEFAULT '{}'
            );

            CREATE INDEX idx_applications_name ON applications("strName");

            -- Roles
            CREATE TABLE roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "strName" TEXT NOT NULL,
                "strDescription" TEXT,
                "strApplicationId" UUID REFERENCES applications(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_roles_name ON roles("strName");
            CREATE INDEX idx_roles_application ON roles("strApplicationId");

            -- Menuoption
            CREATE TABLE menuoption (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "strName" TEXT UNIQUE NOT NULL,
                "strDescription" TEXT NOT NULL,
                "strUrl" TEXT,
                "strIcon" TEXT,
                "strType" TEXT NOT NULL,
                "strMPaternId" UUID REFERENCES menuoption(id) ON DELETE CASCADE,
                "ingOrder" NUMERIC DEFAULT 0
            );

            CREATE INDEX idx_menuoption_name ON menuoption("strName");
            CREATE INDEX idx_menuoption_type ON menuoption("strType");

            -- RolMenuoption
            CREATE TABLE rol_menuoption (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "rolId" UUID REFERENCES roles(id) ON DELETE CASCADE,
                "menuoptionId" UUID REFERENCES menuoption(id) ON DELETE CASCADE,
                UNIQUE("rolId", "menuoptionId")
            );

            CREATE INDEX idx_rol_menuoption_rol ON rol_menuoption("rolId");
            CREATE INDEX idx_rol_menuoption_menu ON rol_menuoption("menuoptionId");

            -- Users
            CREATE TABLE users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                "roleId" UUID REFERENCES roles(id)
            );

            CREATE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users("roleId");

            -- BasicData
            CREATE TABLE basic_data (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "userId" UUID REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_basic_data_user ON basic_data("userId");

            -- NaturalPersonData
            CREATE TABLE natural_person_data (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "basicDataId" UUID REFERENCES basic_data(id) ON DELETE CASCADE,
                "firstName" TEXT NOT NULL,
                "secondName" TEXT,
                "firstSurname" TEXT NOT NULL,
                "secondSurname" TEXT
            );

            CREATE INDEX idx_natural_person_data_name ON natural_person_data("firstName", "firstSurname");

            -- LegalEntityData
            CREATE TABLE legal_entity_data (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "basicDataId" UUID REFERENCES basic_data(id) ON DELETE CASCADE,
                "companyName" TEXT NOT NULL,
                nit TEXT UNIQUE
            );

            CREATE INDEX idx_legal_entity_name ON legal_entity_data("companyName");
            CREATE INDEX idx_legal_entity_nit ON legal_entity_data(nit);

            -- ConfigurationPackage
            CREATE TABLE configuration_package (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL
            );

            CREATE INDEX idx_configuration_package_name ON configuration_package(name);

            -- Package
            CREATE TABLE package (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                "packageId" UUID REFERENCES configuration_package(id),
                "rolId" UUID REFERENCES roles(id)
            );

            CREATE INDEX idx_package_name ON package(name);
            CREATE INDEX idx_package_configuration ON package("packageId");
            CREATE INDEX idx_package_rol ON package("rolId");

            -- Contract
            CREATE TABLE contract (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
                "packageId" UUID REFERENCES package(id) ON DELETE CASCADE,
                "startDate" TIMESTAMP,
                "endDate" TIMESTAMP
            );

            CREATE INDEX idx_contract_user ON contract("userId");
            CREATE INDEX idx_contract_package ON contract("packageId");
            CREATE INDEX idx_contract_dates ON contract("startDate", "endDate");

            -- Image
            CREATE TABLE image (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                url TEXT NOT NULL
            );

            -- Periods
            CREATE TABLE periods (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "startDate" TIMESTAMP,
                "endDate" TIMESTAMP
            );

            CREATE INDEX idx_periods_dates ON periods("startDate", "endDate");

            -- CustomerParameters
            CREATE TABLE customer_parameters (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                data_type TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX idx_customer_parameters_code ON customer_parameters(code);
            CREATE INDEX idx_customer_parameters_name ON customer_parameters(name);

            -- CustomerParametersPeriods
            CREATE TABLE customer_parameters_periods (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_parameter_id UUID REFERENCES customer_parameters(id) ON DELETE CASCADE,
                period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
                value TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(customer_parameter_id, period_id)
            );

            CREATE INDEX idx_customer_parameters_periods_customer_parameter ON customer_parameters_periods(customer_parameter_id);
            CREATE INDEX idx_customer_parameters_periods_period ON customer_parameters_periods(period_id);


            -- GlobalParameters
            CREATE TABLE global_parameters (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                data_type TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX idx_global_parameters_code ON global_parameters(code);
            CREATE INDEX idx_global_parameters_name ON global_parameters(name);

            CREATE TABLE global_parameters_periods (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                global_parameter_id UUID REFERENCES global_parameters(id) ON DELETE CASCADE,
                period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
                value TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(global_parameter_id, period_id)
            );

            CREATE INDEX idx_global_parameters_periods_global_parameter ON global_parameters_periods(global_parameter_id);
            CREATE INDEX idx_global_parameters_periods_period ON global_parameters_periods(period_id);


        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE IF EXISTS global_parameters_periods;
            DROP TABLE IF EXISTS customer_parameters_periods;
            DROP TABLE IF EXISTS global_parameters;
            DROP TABLE IF EXISTS customer_parameters;
            DROP TABLE IF EXISTS periods;
            DROP TABLE IF EXISTS image;
            DROP TABLE IF EXISTS contract;
            DROP TABLE IF EXISTS package;
            DROP TABLE IF EXISTS configuration_package;
            DROP TABLE IF EXISTS legal_entity_data;
            DROP TABLE IF EXISTS natural_person_data;
            DROP TABLE IF EXISTS basic_data;
            DROP TABLE IF EXISTS users;
            DROP TABLE IF EXISTS rol_menuoption;
            DROP TABLE IF EXISTS menuoption;
            DROP TABLE IF EXISTS roles;
            DROP TABLE IF EXISTS applications;
        `);
  }

}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationsModule } from './applications/applications.module';
import { CommonModule } from './common/common.module';
import { MenuoptionsModule } from './menuoptions/menuoptions.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BasicDataModule } from './basic-data/basic-data.module';
import { NaturalPersonDataModule } from './natural-person-data/natural-person-data.module';
import { LegalEntityDataModule } from './legal-entity-data/legal-entity-data.module';
import { PackageModule } from './package/package.module';
import { ConfigurationPackageModule } from './configuration-package/configuration-package.module';
import { ContractModule } from './contract/contract.module';
import { PeriodModule } from './period/period.module';
import { CustomerParametersModule } from './customer-parameters/customer-parameters.module';

@Module({
  imports: [
    // Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configuración de TypeORM sin data-source.ts
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      // Cargar todas las entidades automáticamente
      entities: [__dirname + '/**/*.entity{.ts,.js}'],

      // Solo en desarrollo
      synchronize: true,
      logging: true,

      // Configuración SSL opcional
      // ssl: true,
      // extra: {
      //   ssl: { rejectUnauthorized: false },
      // },
    }),

    // Módulos de la aplicación
    ApplicationsModule,
    MenuoptionsModule,
    RolesModule,
    UsersModule,
    BasicDataModule,
    NaturalPersonDataModule,
    LegalEntityDataModule,
    CommonModule,
    AuthModule,
    PackageModule,
    ConfigurationPackageModule,
    ContractModule,
    PeriodModule,
    CustomerParametersModule,
  ],
})
export class AppModule {}

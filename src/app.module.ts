import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserDependenciesModule } from './user-dependencies/user-dependencies.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { MenuoptionsModule } from './menuoptions/menuoptions.module';
import { ApplicationsModule } from './applications/applications.module';
import { BasicDataModule } from './basic-data/basic-data.module';
import { NaturalPersonDataModule } from './natural-person-data/natural-person-data.module';
import { LegalEntityDataModule } from './legal-entity-data/legal-entity-data.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PackageModule } from './package/package.module';
import { ContractModule } from './contract/contract.module';
import { PeriodModule } from './period/period.module';
import { GlobalParametersForInvoicesModule } from './global-parameters-invoices/global-parameters-for-invoices.module';
import { GlobalParametersPeriodsModule } from './global-parameters-periods/global-parameters-periods.module';
import { GlobalParametersModule } from './global-parameters/global-parameters.module';
import { EntityCodesModule } from './entity-codes/entity-codes.module';
import { SweepModule } from './sweep/sweep.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PotentialUsersModule } from './potential-users/potential-users.module';
import { NotificationsModule } from './notifications/notifications.module';

import { CustomerParametersModule } from './customer-parameters/customer-parameters.module';
import { CustomerParametersPeriodsModule } from './customer-parameters-periods/customer-parameters-periods.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'authoriza',
      synchronize: true,
      logging: true,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [],
      migrationsRun: false,
      autoLoadEntities: true,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    UserRolesModule,
    UserDependenciesModule,
    MenuoptionsModule,
    ApplicationsModule,
    BasicDataModule,
    NaturalPersonDataModule,
    LegalEntityDataModule,
    DocumentTypesModule,
    DashboardModule,
    PackageModule,
    ContractModule,
    EntityCodesModule,
    GlobalParametersModule,
    PeriodModule,
    GlobalParametersForInvoicesModule,
    GlobalParametersPeriodsModule,
    InvoicesModule,
    SweepModule,
    CustomerParametersModule,
    CustomerParametersPeriodsModule,
    PotentialUsersModule,
    NotificationsModule,
  ],
})
export class AppModule {}
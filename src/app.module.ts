import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsModule } from './applications/applications.module';
import { CommonModule } from './common/common.module';
import { MenuoptionsModule } from './menuoptions/menuoptions.module';
import { RolesModule } from './roles/roles.module';
import { RolMenuoption } from './roles/entities/rol-menuoption.entity';
import { Application } from './applications/entities/application.entity';
import { Menuoption } from './menuoptions/entities/menuoption.entity';
import { Rol } from './roles/entities/rol.entity';
import { AuthModule } from './auth/auth.module';
@Module({
  imports: [
    ConfigModule.forRoot(),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      entities: [Application, Menuoption, RolMenuoption, Rol],
      synchronize: true,
    }),
    ApplicationsModule,
    MenuoptionsModule,
    RolesModule,
    CommonModule,
    AuthModule
  ],
})
export class AppModule {}

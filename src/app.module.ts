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
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { BasicDataModule } from './basic-data/basic-data.module';
import { BasicData } from './basic-data/entities/basic-data.entity';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      entities: [Application, Menuoption, RolMenuoption, Rol, User, BasicData],
      synchronize: true,
    }),
    ApplicationsModule,
    MenuoptionsModule,
    RolesModule,
    UsersModule,
    BasicDataModule,
    CommonModule,
    AuthModule,
  ],
})
export class AppModule {}

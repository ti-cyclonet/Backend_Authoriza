import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SelfRegistrationService } from './self-registration.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApplicationsModule } from 'src/applications/applications.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersModule } from 'src/users/users.module';
import { jwtConstants } from './constants';
import { LogsModule } from '../logs/logs.module';
import { EntityCodesModule } from '../entity-codes/entity-codes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { Contract } from '../contract/entities/contract.entity';
import { Package } from '../package/entities/package.entity';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { Rol } from '../roles/entities/rol.entity';
import { BasicData } from '../basic-data/entities/basic-data.entity';
import { DocumentType } from '../document-types/entities/document-type.entity';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1h' },
    }),
    ApplicationsModule,
    LogsModule,
    EntityCodesModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      User,
      Contract,
      Package,
      UserDependency,
      UserRole,
      Rol,
      BasicData,
      DocumentType,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, SelfRegistrationService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}

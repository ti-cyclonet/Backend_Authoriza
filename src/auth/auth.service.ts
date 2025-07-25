import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ApplicationsService } from 'src/applications/applications.service';
import { UsersService } from 'src/users/users.service';
export interface AuthenticatedUser {
  id: string;
  email: string;
  image: string;
  name: string;
  rol: string;
  rolDescription: string;
  firstName?: string;
  secondName?: string;
  businessName?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly applicationsService: ApplicationsService,
    private readonly usersService: UsersService,
  ) {}

  async validateUser(
    loginDto: LoginDto,
  ): Promise<{ access_token: string; user: AuthenticatedUser }> {
    const { email, password, applicationName } = loginDto;

    // 1. Obtener los roles válidos para esta aplicación
    const validRoles =
      await this.applicationsService.findRolesByApplicationName(
        applicationName,
      );

    // 2. Buscar el usuario por email
    const user = await this.usersService.findEntityByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    // 3. Validar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.strPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    // 4. validar si el usuario está activo o por vencer
    const allowedStatuses = ['ACTIVE', 'EXPIRING'];
    if (!allowedStatuses.includes(user.strStatus?.toUpperCase())) {
      throw new UnauthorizedException(
        'Inactive or expired user. Access denied.',
      );
    }

    // 5. Validar si su rol está dentro de los roles válidos
    if (!validRoles.includes(user.rol?.strName)) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    // 6. Generar token JWT
    const payload = { sub: user.id, email: user.strUserName };
    const token = this.jwtService.sign(payload);

    // 7. Retornar usuario sin datos sensibles
    const userWithoutSensitiveData: AuthenticatedUser & {
      firstName?: string;
      secondName?: string;
      businessName?: string;
    } = {
      id: user.id,
      email: user.strUserName,
      image:
        'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(user.strUserName),
      name: user.strUserName,
      rol: user.rol.strName,
      rolDescription: user.rol.strDescription1 || '',
    };

    // Si es persona natural
    if (user.basicData?.strPersonType === 'N') {
      userWithoutSensitiveData.firstName =
        user.basicData?.naturalPersonData?.firstName || '';
      userWithoutSensitiveData.secondName =
        user.basicData?.naturalPersonData?.secondName || '';
    }

    // Si es persona jurídica
    if (user.basicData?.strPersonType === 'J') {
      userWithoutSensitiveData.businessName =
        user.basicData?.legalEntityData?.businessName || '';
    }
    return {
      access_token: token,
      user: userWithoutSensitiveData,
    };
  }
}

import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ApplicationsService } from 'src/applications/applications.service';
import { UsersService } from 'src/users/users.service';
export interface AuthenticatedUser {
  id: string
  email: string;
  image: string;
  name: string;
  rol: string;
  rolDescription: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly applicationsService: ApplicationsService,
    private readonly usersService: UsersService
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
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    // 3. Validar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.strPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    // 4. Validar si su rol está dentro de los roles válidos
    if (!validRoles.includes(user.rol?.strName)) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    // 5. Generar token JWT
    const payload = { sub: user.id, email: user.strUserName };
    const token = this.jwtService.sign(payload);

    // 6. Retornar usuario sin datos sensibles
    const userWithoutSensitiveData: AuthenticatedUser = {
      id: user.id,
      email: user.strUserName,
      image:
        'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(user.strUserName),
      name: user.strUserName,
      rol: user.rol.strName,
      rolDescription: user.rol.strDescription1 || '',
    };

    return {
      access_token: token,
      user: userWithoutSensitiveData,
    };
  }
}

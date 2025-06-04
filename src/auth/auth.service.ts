import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ApplicationsService } from 'src/applications/applications.service';

export interface AuthenticatedUser {
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
    private readonly applicationsService: ApplicationsService
  ) {}

  async validateUser(loginDto: LoginDto): Promise<{ access_token: string; user: AuthenticatedUser }> {
    const { email, password, applicationName } = loginDto;

    // 1. Obtener los roles válidos para esta aplicación
    const validRoles = await this.applicationsService.findRolesByApplicationName(applicationName);
   
    const users = [
      {
        id: 1,
        email: 'admin@inout.com',
        image: 'https://i.pravatar.cc/150?img=32',
        name: 'Natasha Romanoff',
        rol: 'userInout',
        rolDescription: 'Usuario',        
        password: '$2b$10$msp7Q.cGIxF49ujGaNOJcOGy3JqTMVuUQcS2ulYti6f6raeuvvRea' // 1234567890
      },
      {
        id: 2,
        email: 'amambyb@inout.com',
        image: 'https://ui-avatars.com/api/?name=Alfredo+Mamby+Bossa&background=0D8ABC&color=fff',
        name: 'Alfredo Mamby Bossa',
        rol: 'adminInout',
        rolDescription: 'Administrador', 
        password: '$2b$10$msp7Q.cGIxF49ujGaNOJcOGy3JqTMVuUQcS2ulYti6f6raeuvvRea' // 1234567890
      },
      {
        id: 3,
        email: 'admin@authoriza.com',
        image: 'https://i.pravatar.cc/150?img=42',
        name: 'Steve Rogers',
        rol: 'userAuthoriza',
        rolDescription: 'Usuario', 
        password: '$2b$10$msp7Q.cGIxF49ujGaNOJcOGy3JqTMVuUQcS2ulYti6f6raeuvvRea' // 1234567890
      },
      {
        id: 4,
        email: 'amambyb@authoriza.com',
        image: 'https://ui-avatars.com/api/?name=Alfredo+Mamby+Bossa&background=0D8ABC&color=fff',
        name: 'Alfredo Mamby Bossa',
        rol: 'adminAuthoriza',
        rolDescription: 'Administrador', 
        password: '$2b$10$msp7Q.cGIxF49ujGaNOJcOGy3JqTMVuUQcS2ulYti6f6raeuvvRea' // 1234567890
      }
    ];

    // 3. Buscar el usuario
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 4. Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 5. Verificar si su rol pertenece a la aplicación solicitada
    if (!validRoles.includes(user.rol)) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    // 6. Generar token JWT
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    // 7. Retornar usuario sin datos sensibles
    const userWithoutSensitiveData: AuthenticatedUser = {
      email: user.email,
      image: user.image,
      name: user.name,
      rol: user.rol,
      rolDescription: user.rolDescription
    };

    return {
      access_token: token,
      user: userWithoutSensitiveData
    };
  }
}

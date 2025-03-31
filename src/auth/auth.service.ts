import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

export interface AuthenticatedUser {
    email: string;
    image: string;
    name: string;
    rol: string;
}

@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService) {}

    async validateUser(loginDto: LoginDto): Promise<{ access_token: string; user: AuthenticatedUser }> {
        const { email, password, applicationName } = loginDto;       

        // Simulación de usuarios en base de datos con passwords hasheados
        const users = [
            {
                id: 1,
                email: 'admin@inout.com',
                image: 'https://i.pravatar.cc/150?img=32',
                name: 'Natasha Romanoff',
                rol: 'userInout',
                password: '$2b$10$msp7Q.cGIxF49ujGaNOJcOGy3JqTMVuUQcS2ulYti6f6raeuvvRea' // 1234567890
            },
            {
                id: 2,
                email: 'amambyb@inout.com',
                image: 'https://i.pravatar.cc/150?img=12',
                name: 'Alfredo Mamby B.',
                rol: 'adminInout',
                password: '$2b$10$msp7Q.cGIxF49ujGaNOJcOGy3JqTMVuUQcS2ulYti6f6raeuvvRea' // 1234567890
            }
        ];

        // Buscar el usuario en la lista simulada
        const user = users.find(u => u.email === email);
        
        if (!user) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        // Comparar la contraseña ingresada con el hash almacenado
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        const payload = { sub: user.id, email: user.email };
        const token = this.jwtService.sign(payload);

        // Construir el objeto de usuario sin los campos sensibles
        const userWithoutSensitiveData: AuthenticatedUser = {
            email: user.email,
            image: user.image,
            name: user.name,
            rol: user.rol
        };

        return { 
            access_token: token,
            user: userWithoutSensitiveData
        };
    }
}

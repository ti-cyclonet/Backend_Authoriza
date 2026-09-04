import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: any) {
    // Conservar rol y contractId para que el scope por-contrato elegido en el login
    // esté disponible en la sesión (no depender solo de tenantId).
    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      rol: payload.rol,
      contractId: payload.contractId,
    };
  }
}

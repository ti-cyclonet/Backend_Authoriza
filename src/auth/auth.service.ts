import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ApplicationsService } from 'src/applications/applications.service';
import { UsersService } from 'src/users/users.service';
import { LogsService } from '../logs/logs.service';
import { LogAction } from '../logs/entities/log.entity';
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
    private readonly logsService: LogsService,
  ) {}

  async validateUser(
    loginDto: LoginDto,
  ): Promise<{
    access_token: string;
    user: AuthenticatedUser & {
      mustChangePassword?: boolean;
      passwordExpired?: boolean;
    };
    contracts?: Array<{
      contractId: string;
      clientName: string;
      packageName: string;
    }>;
  }> {
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
    // Buscar roles activos del usuario para la aplicación solicitada
    const userActiveRoles = user.userRoles?.filter(ur => 
      ur.status === 'ACTIVE' && 
      validRoles.includes(ur.role?.strName)
    ) || [];

    if (userActiveRoles.length === 0) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    // Detectar múltiples contratos
    const uniqueContracts = new Map();
    userActiveRoles.forEach(ur => {
      if (ur.contractId && ur.contract) {
        uniqueContracts.set(ur.contractId, {
          contractId: ur.contractId,
          clientName: ur.contract.user?.basicData?.strPersonType === 'N' 
            ? `${ur.contract.user.basicData.naturalPersonData?.firstName || ''} ${ur.contract.user.basicData.naturalPersonData?.firstSurname || ''}`.trim()
            : ur.contract.user?.basicData?.legalEntityData?.businessName || 'Cliente',
          packageName: ur.contract.package?.name || 'Paquete'
        });
      }
    });

    console.log('🔍 Total de roles activos:', userActiveRoles.length);
    console.log('📋 Contratos únicos detectados:', uniqueContracts.size);
    console.log('📦 Contratos:', Array.from(uniqueContracts.values()));

    // Si hay múltiples contratos, retornarlos
    if (uniqueContracts.size > 1) {
      const contracts = Array.from(uniqueContracts.values());
      
      console.log('✅ Retornando múltiples contratos al frontend');
      
      return {
        access_token: '',
        user: {
          id: user.id,
          email: user.strUserName,
          image: '',
          name: user.strUserName,
          rol: '',
          rolDescription: ''
        },
        contracts
      };
    }

    console.log('ℹ️ Un solo contrato, continuando con login normal');

    // Usar el primer rol válido encontrado
    const activeRole = userActiveRoles[0].role;

    // 6. Validar si debe cambiar su contraseña
    const mustChangePassword = !!user.mustChangePassword;

    // 7. Validar si han pasado más de 90 días desde el último cambio
    const now = new Date();
    const expirationDate = new Date(user.lastPasswordChange || now);
    expirationDate.setDate(expirationDate.getDate() + 90);
    const passwordExpired = now > expirationDate;

    // 8. Generar token JWT con tenantId basado en el contrato
    // El tenantId debe ser el userId del propietario del contrato
    let tenantId = userActiveRoles[0].contract?.user?.id || user.id;

    const payload = { 
      sub: user.id, 
      email: user.strUserName,
      tenantId: tenantId
    };
    const token = this.jwtService.sign(payload);
    
    // Log login exitoso
    await this.logsService.info(
      LogAction.LOGIN,
      `User logged in: ${user.strUserName}`,
      user.id,
      null,
      { 
        application: applicationName,
        role: activeRole.strName,
        userStatus: user.strStatus,
        mustChangePassword,
        passwordExpired
      }
    );

    // 9. Construir usuario sin datos sensibles
    const userWithoutSensitiveData: AuthenticatedUser & {
      firstName?: string;
      secondName?: string;
      businessName?: string;
      mustChangePassword?: boolean;
      passwordExpired?: boolean;
    } = {
      id: user.id,
      email: user.strUserName,
      image:
        'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(user.strUserName),
      name: user.strUserName,
      rol: activeRole.strName,
      rolDescription: activeRole.strDescription1 || '',
      mustChangePassword,
      passwordExpired,
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

  async completeLoginWithContract(
    email: string,
    applicationName: string,
    contractId: string,
  ): Promise<{
    access_token: string;
    user: AuthenticatedUser & {
      mustChangePassword?: boolean;
      passwordExpired?: boolean;
    };
  }> {
    // Buscar el usuario
    const user = await this.usersService.findEntityByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Obtener los roles válidos para esta aplicación
    const validRoles = await this.applicationsService.findRolesByApplicationName(applicationName);

    // Buscar el rol activo para el contrato seleccionado
    const userRoleForContract = user.userRoles?.find(ur => 
      ur.status === 'ACTIVE' && 
      ur.contractId === contractId &&
      validRoles.includes(ur.role?.strName)
    );

    if (!userRoleForContract) {
      throw new UnauthorizedException('No valid role found for selected contract');
    }

    const activeRole = userRoleForContract.role;

    // Validar cambio de contraseña
    const mustChangePassword = !!user.mustChangePassword;
    const now = new Date();
    const expirationDate = new Date(user.lastPasswordChange || now);
    expirationDate.setDate(expirationDate.getDate() + 90);
    const passwordExpired = now > expirationDate;

    // Generar token con tenantId basado en el propietario del contrato seleccionado
    let tenantId = userRoleForContract.contract?.user?.id || user.id;

    const payload = { 
      sub: user.id, 
      email: user.strUserName,
      tenantId: tenantId,
      contractId: contractId
    };
    const token = this.jwtService.sign(payload);

    // Log login exitoso
    await this.logsService.info(
      LogAction.LOGIN,
      `User logged in with contract: ${user.strUserName}`,
      user.id,
      null,
      { 
        application: applicationName,
        role: activeRole.strName,
        contractId: contractId,
        userStatus: user.strStatus
      }
    );

    // Construir usuario
    const userWithoutSensitiveData: AuthenticatedUser & {
      mustChangePassword?: boolean;
      passwordExpired?: boolean;
    } = {
      id: user.id,
      email: user.strUserName,
      image: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.strUserName),
      name: user.strUserName,
      rol: activeRole.strName,
      rolDescription: activeRole.strDescription1 || '',
      mustChangePassword,
      passwordExpired,
    };

    if (user.basicData?.strPersonType === 'N') {
      userWithoutSensitiveData.firstName = user.basicData?.naturalPersonData?.firstName || '';
      userWithoutSensitiveData.secondName = user.basicData?.naturalPersonData?.secondName || '';
    }

    if (user.basicData?.strPersonType === 'J') {
      userWithoutSensitiveData.businessName = user.basicData?.legalEntityData?.businessName || '';
    }

    return {
      access_token: token,
      user: userWithoutSensitiveData,
    };
  }
}

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
  isAuthorizedSigner?: boolean;
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
    contract?: {
      codePrefix: string;
      clientName?: string | null;
      packageName?: string | null;
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
    const allowedStatuses = ['ACTIVE', 'EXPIRING', 'CONFIRMED'];
    if (!allowedStatuses.includes(user.strStatus?.toUpperCase())) {
      throw new UnauthorizedException(
        'Inactive or expired user. Access denied.',
      );
    }

    // 5. Validar si su rol está dentro de los roles válidos
    // Roles que no habilitan inicio de sesión en aplicaciones (solo administrativos)
    const blockedRoles = ['accountOwner'];

    // Buscar roles activos del usuario para la aplicación solicitada,
    // EXCLUYENDO los roles bloqueados. Así, si el usuario tiene accountOwner
    // PERO también un rol válido (ej. userShotra), no se le bloquea el login:
    // simplemente se ignora el rol administrativo.
    const userActiveRoles = user.userRoles?.filter(ur =>
      ur.status === 'ACTIVE' &&
      validRoles.includes(ur.role?.strName) &&
      !blockedRoles.includes(ur.role?.strName)
    ) || [];

    if (userActiveRoles.length === 0) {
      // ¿Tenía solo roles bloqueados (accountOwner) para esta app? Mensaje claro.
      const hadOnlyBlocked = (user.userRoles || []).some(ur =>
        ur.status === 'ACTIVE' &&
        validRoles.includes(ur.role?.strName) &&
        blockedRoles.includes(ur.role?.strName)
      );
      if (hadOnlyBlocked) {
        throw new UnauthorizedException('This account type cannot log in to applications');
      }
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    // Detectar múltiples contratos (para esta app) y forzar selección cuando hay
    // ambigüedad. Cada contrato representa un "tenant"/plan distinto; el usuario
    // debe elegir con cuál sesión entrar para que tenantId/rol sean deterministas.
    const uniqueContracts = new Map();
    userActiveRoles.forEach(ur => {
      if (ur.contractId && ur.contract) {
        uniqueContracts.set(ur.contractId, {
          contractId: ur.contractId,
          clientName: ur.contract.user?.basicData?.strPersonType === 'N' 
            ? `${ur.contract.user.basicData.naturalPersonData?.firstName || ''} ${ur.contract.user.basicData.naturalPersonData?.firstSurname || ''}`.trim()
            : ur.contract.user?.basicData?.legalEntityData?.businessName || 'Cliente',
          packageName: ur.contract.package?.name || 'Paquete',
          // Aplicación destino del contrato (para distinguir tenants del mismo titular)
          targetApplication: ur.contract.package?.targetApplication || applicationName,
        });
      }
    });

    // Si hay múltiples contratos, retornarlos para que el usuario elija (selector)
    if (uniqueContracts.size > 1) {
      const contracts = Array.from(uniqueContracts.values());
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

    // Elegir el rol activo de forma DETERMINISTA:
    // preferir el rol ligado a un contrato (si existe) sobre roles sin contrato,
    // para que tenantId/codePrefix se deriven de un contrato real y no de [0] arbitrario.
    const roleWithContract = userActiveRoles.find(ur => ur.contractId && ur.contract);
    const selectedUserRole = roleWithContract || userActiveRoles[0];
    const activeRole = selectedUserRole.role;

    // 6. Validar si debe cambiar su contraseña
    const mustChangePassword = !!user.mustChangePassword;

    // 7. Validar si han pasado más de 90 días desde el último cambio
    const now = new Date();
    const expirationDate = new Date(user.lastPasswordChange || now);
    expirationDate.setDate(expirationDate.getDate() + 90);
    const passwordExpired = now > expirationDate;

    // 8. Generar token JWT con tenantId basado en el contrato del rol seleccionado
    // El tenantId es el dueño del contrato al que está vinculado el rol activo del usuario
    const contractOwner = selectedUserRole.contract?.user;
    let tenantId = contractOwner?.id || user.id;

    // Si el usuario no tiene contrato directo, buscar a través de dependencias
    if (!contractOwner) {
      const dependency = user.principals?.find(p => p.status === 'ACTIVE');
      if (dependency) {
        tenantId = dependency.principalUserId;
      }
    }
    let codePrefix = selectedUserRole.contract?.codePrefix || null;
    const selectedContractId = selectedUserRole.contractId || null;

    const payload = {
      sub: user.id,
      email: user.strUserName,
      tenantId: tenantId,
      // Incluir contractId también en el login de un solo contrato, para que las
      // apps que scopean por contrato tengan el dato disponible.
      contractId: selectedContractId,
      rol: activeRole.strName
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
      isAuthorizedSigner?: boolean;
    } = {
      id: user.id,
      email: user.strUserName,
      image:
        'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(user.strUserName),
      name: user.strUserName,
      rol: activeRole.strName,
      rolDescription: activeRole.strDescription1 || '',
      isAuthorizedSigner: await this.usersService.isUserAuthorizedSigner(user.id),
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
      contract: {
        codePrefix: codePrefix,
        clientName: uniqueContracts.size === 1 
          ? Array.from(uniqueContracts.values())[0].clientName 
          : null,
        packageName: uniqueContracts.size === 1 
          ? Array.from(uniqueContracts.values())[0].packageName 
          : null,
      }
    };
  }

  async checkEmailExists(email: string): Promise<{ id: string } | null> {
    const user = await this.usersService.findEntityByEmail(email);
    return user ? { id: user.id } : null;
  }

  /**
   * Returns the access status of a user by email, used by external apps (Kiri)
   * to determine if the user is allowed to access. Authoriza is the source of truth.
   * A user is allowed only if verified and status is ACTIVE.
   */
  async getUserAccessStatus(email: string): Promise<{
    exists: boolean;
    allowed: boolean;
    status: string | null;
    isVerified: boolean;
    reason?: string;
  }> {
    const user = await this.usersService.findEntityByEmail(email);
    if (!user) {
      return { exists: false, allowed: false, status: null, isVerified: false, reason: 'USER_NOT_FOUND' };
    }

    const status = user.strStatus;
    const isVerified = !!user.isVerified;
    const blockedStatuses = ['INACTIVE', 'SUSPENDED', 'DELINQUENT', 'DELETED'];

    let allowed = true;
    let reason: string | undefined;

    if (!isVerified) {
      allowed = false;
      reason = 'NOT_VERIFIED';
    } else if (blockedStatuses.includes(status)) {
      allowed = false;
      reason = status;
    } else if (status === 'UNCONFIRMED') {
      allowed = false;
      reason = 'UNCONFIRMED';
    }

    return { exists: true, allowed, status, isVerified, reason };
  }

  async loginAfterVerification(email: string): Promise<{ access_token: string; user: AuthenticatedUser }> {
    const user = await this.usersService.findEntityByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isVerified) throw new UnauthorizedException('Email not verified');
    if (user.strStatus !== 'CONFIRMED') throw new UnauthorizedException('User is not in CONFIRMED status');

    const payload = {
      sub: user.id,
      email: user.strUserName,
      tenantId: user.id,
      rol: 'unconfirmed',
    };
    const token = this.jwtService.sign(payload, { expiresIn: '10m' });

    const userData: AuthenticatedUser = {
      id: user.id,
      email: user.strUserName,
      image: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.strUserName),
      name: user.strUserName,
      rol: 'unconfirmed',
      rolDescription: '',
      firstName: user.basicData?.naturalPersonData?.firstName || '',
      businessName: user.basicData?.legalEntityData?.businessName || '',
    };

    return { access_token: token, user: userData };
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
      isAuthorizedSigner?: boolean;
    };
    contract?: {
      codePrefix: string;
      clientName?: string | null;
      packageName?: string | null;
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
    const contractOwnerComplete = userRoleForContract.contract?.user;
    let tenantId = contractOwnerComplete?.id || user.id;
    
    if (!contractOwnerComplete) {
      const dependency = user.principals?.find(p => p.status === 'ACTIVE');
      if (dependency) {
        tenantId = dependency.principalUserId;
      }
    }
    let codePrefix = userRoleForContract.contract?.codePrefix || null;

    const payload = { 
      sub: user.id, 
      email: user.strUserName,
      tenantId: tenantId,
      contractId: contractId,
      rol: activeRole.strName
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
      isAuthorizedSigner?: boolean;
    } = {
      id: user.id,
      email: user.strUserName,
      image: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.strUserName),
      name: user.strUserName,
      rol: activeRole.strName,
      rolDescription: activeRole.strDescription1 || '',
      // Incluir el flag de firmante (igual que el login normal). Sin esto, las
      // apps que llegan por login/complete (FactoNet) reciben undefined y no
      // muestran el botón de firmar, aunque el usuario sí sea firmante.
      isAuthorizedSigner: await this.usersService.isUserAuthorizedSigner(user.id),
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
      contract: {
        codePrefix: codePrefix,
        clientName: userRoleForContract.contract?.user?.basicData?.strPersonType === 'N'
          ? `${userRoleForContract.contract.user.basicData.naturalPersonData?.firstName || ''} ${userRoleForContract.contract.user.basicData.naturalPersonData?.firstSurname || ''}`.trim()
          : userRoleForContract.contract?.user?.basicData?.legalEntityData?.businessName || null,
        packageName: userRoleForContract.contract?.package?.name || null,
      }
    };
  }
}

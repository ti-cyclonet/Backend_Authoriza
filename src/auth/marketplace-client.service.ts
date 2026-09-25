import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { Rol } from '../roles/entities/rol.entity';
import { BasicData } from '../basic-data/entities/basic-data.entity';
import { NaturalPersonData } from '../natural-person-data/entities/natural-person-data.entity';
import { DocumentType } from '../document-types/entities/document-type.entity';
import { ConsentsService, ConsentInput, RequestMeta } from '../consents/consents.service';
import { PotentialUser, PotentialUserStatus } from '../potential-users/potential-user.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractService } from '../contract/contract.service';
import { UserRolesService } from '../user-roles/user-roles.service';
import { AuthService } from './auth.service';

const CLIENT_ROLE = 'clienteInout';
const APPLICATION = 'Inout';
const ALLOWED_LOGIN_STATUSES = ['ACTIVE', 'EXPIRING', 'CONFIRMED'];
const MAX_CODE_ATTEMPTS = 5;
/** Tipos de documento de persona natural admitidos (catálogo document_types de Authoriza). */
const PERSON_DOCUMENT_TYPES = ['CC', 'CE', 'PP'];
/** Mismos códigos que el registro de InOut (landing) y de Shotra. */
const SEX_CODES = ['M', 'F', 'O'];
const MARITAL_STATUS_CODES = ['S', 'C', 'U', 'D', 'V'];

export type { ConsentInput, RequestMeta } from '../consents/consents.service';

export interface MarketplaceRegisterInput extends ConsentInput {
  tenantId: string;
  email: string;
  password: string;
  firstName?: string;
  secondName?: string;
  firstSurname?: string;
  secondSurname?: string;
  birthdate?: string;
  gender?: string;
  civilStatus?: string;
  documentType?: string;
  documentNumber?: string;
  phone?: string;
}

/**
 * Registro / inicio de sesión de CLIENTES desde el MarketPlace público de un
 * negocio (tenant) de InOut. El cliente queda como usuario de Authoriza,
 * dependiente del tenant y con rol clienteInout en su contrato de InOut —
 * igual que si el negocio lo hubiera creado desde su módulo de Usuarios.
 *
 * Reglas:
 * - El correo SIEMPRE se confirma con un código de 6 dígitos antes de
 *   vincular la cuenta al negocio y emitir un token.
 * - Se exige y se guarda la aceptación de Términos y de la autorización de
 *   Tratamiento de Datos (Habeas Data) con su versión, IP y navegador.
 * - Una cuenta existente solo se vincula probando su contraseña.
 * - El tope nClientes del paquete del negocio se respeta
 *   (UserRolesService.validateRoleAvailability).
 */
@Injectable()
export class MarketplaceClientService {
  private readonly logger = new Logger(MarketplaceClientService.name);
  /** Intentos fallidos de código por correo (instancia única en EC2). */
  private readonly failedCodeAttempts = new Map<string, number>();

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserDependency) private readonly dependencyRepository: Repository<UserDependency>,
    @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Rol) private readonly rolRepository: Repository<Rol>,
    @InjectRepository(BasicData) private readonly basicDataRepository: Repository<BasicData>,
    @InjectRepository(DocumentType) private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(PotentialUser) private readonly potentialUserRepository: Repository<PotentialUser>,
    private readonly dataSource: DataSource,
    private readonly entityCodeService: EntityCodeService,
    private readonly notificationsService: NotificationsService,
    private readonly contractService: ContractService,
    private readonly userRolesService: UserRolesService,
    private readonly authService: AuthService,
    private readonly consentsService: ConsentsService,
  ) {}

  // ─────────────────────────── Endpoints ───────────────────────────

  async register(input: MarketplaceRegisterInput, meta: RequestMeta) {
    this.assertConsents(input);
    const email = this.normalizeEmail(input.email);
    if (!input.password || input.password.length < 8) {
      throw new BadRequestException({ code: 'WEAK_PASSWORD', message: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const tenant = await this.resolveTenant(input.tenantId);
    const role = await this.getClientRole();

    const existing = await this.userRepository.findOne({ where: { strUserName: email } });

    if (existing) {
      // Vincular una cuenta existente solo si prueba que es suya
      const ok = await bcrypt.compare(input.password, existing.strPassword || '');
      if (!ok) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Ya existe una cuenta con este correo. Ingresa con tu contraseña actual o usa "Iniciar sesión".',
        });
      }
      await this.recordConsents(existing.id, email, input.tenantId, input, 'MARKETPLACE_REGISTER', meta);

      if (!existing.isVerified) {
        await this.issueVerificationCode(existing, tenant.businessName);
        return { verificationRequired: true, email, message: 'Te enviamos un código para confirmar tu correo.' };
      }

      await this.linkClient(existing.id, input.tenantId, tenant.contractId, role);
      return { verificationRequired: false, ...(await this.issueToken(email, tenant.contractId)) };
    }

    // Cuenta nueva
    // Mismos requisitos de identidad que una cuenta de Authoriza: nombre,
    // apellido, documento (tipo + número) y teléfono.
    const documentType = (input.documentType || '').trim().toUpperCase();
    const documentNumber = (input.documentNumber || '').replace(/[\s.]/g, '');
    if (!input.firstName?.trim() || !input.firstSurname?.trim() || !input.phone?.trim()) {
      throw new BadRequestException({ code: 'MISSING_FIELDS', message: 'Nombre, apellido y teléfono son obligatorios.' });
    }
    // Datos de persona natural que exige Authoriza (CreateNaturalPersonDataDto)
    const birthdate = (input.birthdate || '').trim();
    const age = this.ageFrom(birthdate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate) || isNaN(age)) {
      throw new BadRequestException({ code: 'INVALID_BIRTHDATE', message: 'Indica una fecha de nacimiento válida.' });
    }
    if (age < 18) {
      throw new BadRequestException({ code: 'UNDERAGE', message: 'Debes ser mayor de 18 años para crear una cuenta.' });
    }
    if (!SEX_CODES.includes(input.gender || '') || !MARITAL_STATUS_CODES.includes(input.civilStatus || '')) {
      throw new BadRequestException({ code: 'MISSING_FIELDS', message: 'Selecciona tu sexo y tu estado civil.' });
    }
    if (!PERSON_DOCUMENT_TYPES.includes(documentType) || !/^[A-Za-z0-9-]{4,20}$/.test(documentNumber)) {
      throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: 'Indica un tipo y número de documento válidos.' });
    }
    // El negocio debe tener cupo de clientes ANTES de crear la cuenta
    await this.userRolesService.validateRoleAvailability(tenant.contractId, role.id);

    const docType = await this.documentTypeRepository.findOne({ where: { documentType } });
    if (!docType) {
      throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: 'Tipo de documento no válido.' });
    }
    {
      const existingDoc = await this.basicDataRepository.findOne({
        where: { documentTypeId: docType.id, documentNumber },
      });
      if (existingDoc) {
        throw new ConflictException({
          code: 'DOCUMENT_ALREADY_REGISTERED',
          message: `El documento ${documentType} ${documentNumber} ya está registrado con otra cuenta. Si es tuyo, inicia sesión.`,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const code = await this.entityCodeService.generateCode('User');

    const user = await this.dataSource.transaction(async (manager) => {
      const newUser = manager.create(User, {
        strUserName: email,
        strPassword: hashedPassword,
        code,
        strStatus: 'UNCONFIRMED',
        isVerified: false,
        isAuthorizedSigner: false,
        mustChangePassword: false,
        lastPasswordChange: new Date(),
      });
      const savedUser = await manager.save(newUser);

      const basicData = await manager.save(manager.create(BasicData, {
        strPersonType: 'N' as const,
        strStatus: 'ACTIVE',
        documentTypeId: docType.id,
        documentNumber,
        user: savedUser,
      }));
      savedUser.basicData = basicData;
      await manager.save(savedUser);

      await manager.save(manager.create(NaturalPersonData, {
        firstName: input.firstName!.trim(),
        secondName: input.secondName?.trim() || null,
        firstSurname: input.firstSurname!.trim(),
        secondSurname: input.secondSurname?.trim() || null,
        birthDate: new Date(`${birthdate}T00:00:00`),
        sex: input.gender,
        maritalStatus: input.civilStatus,
        phone: input.phone!.trim(),
        basicData,
      }));
      return savedUser;
    });

    await this.recordConsents(user.id, email, input.tenantId, input, 'MARKETPLACE_REGISTER', meta);
    await this.markPotentialUserConverted(email);
    await this.issueVerificationCode(user, tenant.businessName, input.firstName);

    return { verificationRequired: true, email, message: 'Te enviamos un código para confirmar tu correo.' };
  }

  async verify(input: { tenantId: string; email: string; code: string }) {
    const email = this.normalizeEmail(input.email);
    const user = await this.userRepository.findOne({ where: { strUserName: email } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'No encontramos una cuenta con ese correo.' });

    if (user.isVerified) {
      // Nunca emitir token solo con un código ya consumido: debe iniciar sesión
      throw new BadRequestException({ code: 'ALREADY_VERIFIED', message: 'Tu correo ya está confirmado. Inicia sesión con tu contraseña.' });
    }

    const attempts = this.failedCodeAttempts.get(email) || 0;
    if (attempts >= MAX_CODE_ATTEMPTS || !user.verificationCode) {
      throw new BadRequestException({ code: 'CODE_LOCKED', message: 'Demasiados intentos. Solicita un nuevo código.' });
    }
    if (user.verificationExpires && new Date() > user.verificationExpires) {
      throw new BadRequestException({ code: 'CODE_EXPIRED', message: 'El código expiró. Solicita uno nuevo.' });
    }
    if (String(input.code || '').trim() !== user.verificationCode) {
      this.failedCodeAttempts.set(email, attempts + 1);
      throw new BadRequestException({ code: 'INVALID_CODE', message: 'El código no es correcto.' });
    }

    // La autorización de datos debe haberse otorgado ante ESTE negocio
    await this.assertConsentGiven(user.id, input.tenantId);

    const tenant = await this.resolveTenant(input.tenantId);
    const role = await this.getClientRole();

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    user.strStatus = 'ACTIVE';
    await this.userRepository.save(user);
    this.failedCodeAttempts.delete(email);

    await this.linkClient(user.id, input.tenantId, tenant.contractId, role);
    return this.issueToken(email, tenant.contractId);
  }

  async login(input: { tenantId: string; email: string; password: string }) {
    const email = this.normalizeEmail(input.email);
    const user = await this.userRepository.findOne({ where: { strUserName: email } });
    const ok = user ? await bcrypt.compare(input.password || '', user.strPassword || '') : false;
    if (!user || !ok) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' });
    }

    const tenant = await this.resolveTenant(input.tenantId);

    if (!user.isVerified) {
      await this.issueVerificationCode(user, tenant.businessName);
      return { verificationRequired: true, email, message: 'Confirma tu correo: te enviamos un nuevo código.' };
    }
    if (!ALLOWED_LOGIN_STATUSES.includes((user.strStatus || '').toUpperCase())) {
      throw new ForbiddenException({ code: 'USER_INACTIVE', message: 'Tu cuenta está inactiva. Contacta al negocio.' });
    }

    const role = await this.getClientRole();
    const isClient = await this.userRoleRepository.findOne({
      where: { userId: user.id, roleId: role.id, contractId: tenant.contractId, status: 'ACTIVE' },
    });
    if (!isClient) {
      // Tiene cuenta, pero no es cliente de este negocio: debe aceptar los
      // términos/tratamiento de datos de ESTE negocio (register con su clave)
      throw new ForbiddenException({
        code: 'NOT_A_CLIENT',
        message: `Aún no eres cliente de ${tenant.businessName}. Acepta los términos para unirte con tu cuenta.`,
      });
    }

    // Clientes creados por el negocio (módulo Usuarios) nunca aceptaron los
    // términos/datos de la tienda: se les piden UNA vez, al iniciar sesión
    // (el frontend reusa el paso de "unirse", que las registra).
    if (!(await this.consentsService.hasHabeasDataFor(user.id, input.tenantId))) {
      throw new ForbiddenException({
        code: 'CONSENT_REQUIRED',
        message: `Para comprar en ${tenant.businessName} acepta sus Términos y la autorización de tratamiento de datos.`,
      });
    }

    return { verificationRequired: false, ...(await this.issueToken(email, tenant.contractId)) };
  }

  /** Perfil del cliente en sesión (para precargar el checkout). */
  async me(user: { email?: string; rol?: string; tenantId?: string }) {
    if (user?.rol !== CLIENT_ROLE || !user?.email) {
      throw new ForbiddenException({ code: 'NOT_A_CLIENT', message: 'Solo cuentas de cliente.' });
    }
    return this.getProfile(user.email);
  }

  /** Reenvía el código. Respuesta genérica para no revelar si el correo existe. */
  async resendCode(input: { tenantId: string; email: string }) {
    const email = this.normalizeEmail(input.email);
    const user = await this.userRepository.findOne({ where: { strUserName: email } });
    if (user && !user.isVerified) {
      const tenant = await this.resolveTenant(input.tenantId).catch(() => null);
      await this.issueVerificationCode(user, tenant?.businessName);
    }
    return { message: 'Si la cuenta está pendiente de confirmación, te enviamos un nuevo código.' };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  /** Edad cumplida a hoy para AAAA-MM-DD (NaN si la fecha no es válida). */
  private ageFrom(birthdate: string): number {
    const b = new Date(`${birthdate}T00:00:00`);
    if (isNaN(b.getTime())) return NaN;
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }

  private normalizeEmail(email: string): string {
    const value = (email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new BadRequestException({ code: 'INVALID_EMAIL', message: 'Ingresa un correo válido.' });
    }
    return value;
  }

  private assertConsents(input: ConsentInput) {
    this.consentsService.assertAccepted(input);
  }

  private async recordConsents(
    userId: string | null,
    email: string,
    tenantId: string,
    input: ConsentInput,
    source: string,
    meta: RequestMeta,
  ) {
    await this.consentsService.record({ userId, email, tenantId, application: APPLICATION, source, consents: input, meta });
  }

  private async assertConsentGiven(userId: string, tenantId: string) {
    if (!(await this.consentsService.hasHabeasDataFor(userId, tenantId))) {
      throw new ForbiddenException({
        code: 'CONSENT_REQUIRED',
        message: 'Debes autorizar el tratamiento de tus datos ante este negocio antes de continuar.',
      });
    }
  }

  /** Contrato de InOut del negocio + nombre para mostrar. */
  private async resolveTenant(tenantId: string): Promise<{ contractId: string; businessName: string }> {
    if (!tenantId) throw new BadRequestException({ code: 'TENANT_REQUIRED', message: 'Falta el negocio.' });
    let contractId: string | undefined;
    try {
      contractId = (await this.contractService.findTenantLimits(tenantId, APPLICATION))?.contractId;
    } catch {
      contractId = undefined;
    }
    if (!contractId) {
      throw new BadRequestException({ code: 'STORE_INACTIVE', message: 'Esta tienda no está disponible en este momento.' });
    }

    const owner = await this.userRepository.findOne({
      where: { id: tenantId },
      relations: ['basicData', 'basicData.naturalPersonData', 'basicData.legalEntityData'],
    });
    const bd: any = owner?.basicData;
    const businessName =
      bd?.legalEntityData?.businessName ||
      [bd?.naturalPersonData?.firstName, bd?.naturalPersonData?.firstSurname].filter(Boolean).join(' ') ||
      'el negocio';
    return { contractId, businessName };
  }

  private async getClientRole(): Promise<Rol> {
    const role = await this.rolRepository.findOne({ where: { strName: CLIENT_ROLE } });
    if (!role) throw new InternalServerErrorException(`Rol ${CLIENT_ROLE} no configurado`);
    return role;
  }

  /**
   * Vincula al usuario como cliente del negocio (idempotente): dependencia
   * ACTIVE del tenant + rol clienteInout en su contrato. No usa
   * UserRolesService.assignRole a propósito: ese flujo cancela el contrato
   * PROPIO del usuario para la app cuando el rol se asigna sobre el contrato
   * de otro — y un cliente puede ser a la vez dueño de su propio negocio en
   * InOut.
   */
  private async linkClient(userId: string, tenantId: string, contractId: string, role: Rol) {
    const existingRole = await this.userRoleRepository.findOne({ where: { userId, roleId: role.id, contractId } });
    if (existingRole?.status !== 'ACTIVE') {
      await this.userRolesService.validateRoleAvailability(contractId, role.id);
    }

    const dependency = await this.dependencyRepository.findOne({ where: { principalUserId: tenantId, dependentUserId: userId } });
    if (!dependency) {
      await this.dependencyRepository.save(this.dependencyRepository.create({
        principalUserId: tenantId,
        dependentUserId: userId,
        status: 'ACTIVE',
        isAuthorizedSigner: false,
      }));
    } else if (dependency.status !== 'ACTIVE') {
      dependency.status = 'ACTIVE';
      await this.dependencyRepository.save(dependency);
    }

    if (!existingRole) {
      await this.userRoleRepository.save(this.userRoleRepository.create({ userId, roleId: role.id, contractId, status: 'ACTIVE' }));
    } else if (existingRole.status !== 'ACTIVE') {
      existingRole.status = 'ACTIVE';
      await this.userRoleRepository.save(existingRole);
    }
  }

  private async issueToken(email: string, contractId: string) {
    // Contraseña o código ya validados por el llamador: se emite el token
    // del contrato de InOut del negocio (tenantId = dueño del contrato).
    // Pide explícitamente el rol de cliente: el usuario puede ser además
    // Administrador (u otro rol de staff) en el mismo contrato.
    const result = await this.authService.completeLoginWithContract(email, APPLICATION, contractId, CLIENT_ROLE);
    return { access_token: result.access_token, user: result.user, profile: await this.getProfile(email) };
  }

  /** Datos guardados del cliente para precargar el formulario del pedido. */
  private async getProfile(email: string) {
    const user = await this.userRepository.findOne({
      where: { strUserName: email },
      relations: ['basicData', 'basicData.naturalPersonData', 'basicData.documentType'],
    });
    const bd: any = user?.basicData;
    const np: any = bd?.naturalPersonData;
    return {
      email,
      firstName: np?.firstName || null,
      secondName: np?.secondName || null,
      firstSurname: np?.firstSurname || null,
      secondSurname: np?.secondSurname || null,
      phone: np?.phone || null,
      documentType: bd?.documentType?.documentType || null,
      documentNumber: bd?.documentNumber || null,
    };
  }

  /** Un invitado que compró antes (cliente potencial) y ahora crea su cuenta. */
  private async markPotentialUserConverted(email: string) {
    try {
      const lead = await this.potentialUserRepository.findOne({ where: { email } });
      if (lead && lead.status !== PotentialUserStatus.CONVERTED) {
        lead.status = PotentialUserStatus.CONVERTED;
        await this.potentialUserRepository.save(lead);
      }
    } catch (err) {
      this.logger.warn(`No se pudo marcar como convertido el cliente potencial ${email}: ${(err as Error).message}`);
    }
  }

  private async issueVerificationCode(user: User, businessName?: string, firstName?: string) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 30);
    user.verificationCode = verificationCode;
    user.verificationExpires = verificationExpires;
    await this.userRepository.save(user);
    this.failedCodeAttempts.delete(user.strUserName);

    try {
      await this.notificationsService.sendByTemplate('MARKETPLACE_CLIENT_VERIFICATION', user.strUserName, {
        customerName: firstName || 'cliente',
        businessName: businessName || 'la tienda',
        verificationCode,
        year: new Date().getFullYear().toString(),
      });
    } catch (err) {
      this.logger.warn(`No se pudo enviar el código de verificación a ${user.strUserName}: ${(err as Error).message}`);
    }
  }
}

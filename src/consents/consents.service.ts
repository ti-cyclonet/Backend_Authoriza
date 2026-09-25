import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserConsent } from './entities/user-consent.entity';

export interface ConsentInput {
  acceptTerms?: boolean;
  acceptHabeasData?: boolean;
  termsVersion?: string;
  habeasDataVersion?: string;
}

export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RecordConsentsParams {
  userId: string | null;
  email: string;
  /** Negocio ante quien se otorga (MarketPlace); null cuando el responsable es CycloNet. */
  tenantId: string | null;
  application: string;
  source: string;
  consents: ConsentInput;
  meta?: RequestMeta;
}

/**
 * Aceptación de Términos y Condiciones y de la autorización de Tratamiento
 * de Datos Personales (Ley 1581 de 2012), con la prueba que exige el
 * Decreto 1377 de 2013 (art. 7): versión del documento, fecha, IP y
 * navegador. Lo usan los registros del MarketPlace de InOut, de Shotra y de
 * la landing de InOut.
 */
@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(UserConsent) private readonly consentRepository: Repository<UserConsent>,
  ) {}

  assertAccepted(input: ConsentInput): void {
    if (input?.acceptTerms !== true || input?.acceptHabeasData !== true) {
      throw new BadRequestException({
        code: 'CONSENT_REQUIRED',
        message: 'Debes aceptar los Términos y Condiciones y autorizar el tratamiento de tus datos personales.',
      });
    }
    if (!input.termsVersion || !input.habeasDataVersion) {
      throw new BadRequestException({ code: 'CONSENT_VERSION_REQUIRED', message: 'Falta la versión de los documentos aceptados.' });
    }
  }

  /** true si trae la aceptación completa (para endpoints donde es opcional). */
  hasConsents(input: ConsentInput): boolean {
    return input?.acceptTerms === true && input?.acceptHabeasData === true
      && !!input.termsVersion && !!input.habeasDataVersion;
  }

  async record(params: RecordConsentsParams): Promise<void> {
    const base = {
      userId: params.userId,
      email: params.email,
      tenantId: params.tenantId,
      application: params.application,
      source: params.source,
      ipAddress: params.meta?.ipAddress?.slice(0, 64) || null,
      userAgent: params.meta?.userAgent?.slice(0, 500) || null,
    };
    await this.consentRepository.save([
      this.consentRepository.create({ ...base, consentType: 'TERMS_CONDITIONS', documentVersion: params.consents.termsVersion! }),
      this.consentRepository.create({ ...base, consentType: 'HABEAS_DATA', documentVersion: params.consents.habeasDataVersion! }),
    ]);
  }

  async hasHabeasDataFor(userId: string, tenantId: string | null): Promise<boolean> {
    const consent = await this.consentRepository.findOne({
      where: { userId, consentType: 'HABEAS_DATA', ...(tenantId ? { tenantId } : {}) },
    });
    return !!consent;
  }
}

/** IP (detrás del proxy nginx) y navegador de la petición. */
export function requestMetaFrom(req: { headers: Record<string, any>; ip?: string }): RequestMeta {
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return {
    ipAddress: forwarded || req.ip || null,
    userAgent: (req.headers['user-agent'] as string | undefined) || null,
  };
}

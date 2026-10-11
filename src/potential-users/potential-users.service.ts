import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PotentialUser, PotentialUserStatus } from './potential-user.entity';
import { CreatePotentialUserDto } from './dto/create-potential-user.dto';
import { CreateTenantCustomerDto } from './dto/create-tenant-customer.dto';

@Injectable()
export class PotentialUsersService {
  constructor(
    @InjectRepository(PotentialUser)
    private potentialUsersRepository: Repository<PotentialUser>,
  ) {}

  /**
   * Upsert del lead: por email si viene (es único en la tabla); si el
   * invitado solo dio teléfono, por (teléfono, tenant de origen). Un segundo
   * checkout actualiza el lead existente en vez de duplicarlo o fallar por
   * unicidad. No pisa un registro ya CONVERTED (ya es un usuario real).
   */
  async create(createPotentialUserDto: CreatePotentialUserDto): Promise<PotentialUser> {
    const email = createPotentialUserDto.email?.trim().toLowerCase() || null;
    const phone = createPotentialUserDto.phone?.trim() || null;
    if (!email && !phone) {
      throw new BadRequestException('Se requiere correo o teléfono del cliente potencial.');
    }
    createPotentialUserDto = { ...createPotentialUserDto, email: email ?? undefined, phone: phone ?? undefined };

    const existing = email
      ? await this.potentialUsersRepository.findOne({ where: { email } })
      : await this.potentialUsersRepository.findOne({
          where: { phone, sourceTenantId: createPotentialUserDto.sourceTenantId ?? undefined },
        });

    if (existing) {
      if (existing.status === PotentialUserStatus.CONVERTED) {
        return existing;
      }
      Object.assign(existing, {
        sourceApplication: createPotentialUserDto.sourceApplication,
        documentType: createPotentialUserDto.documentType ?? existing.documentType,
        documentNumber: createPotentialUserDto.documentNumber ?? existing.documentNumber,
        name: createPotentialUserDto.name ?? existing.name,
        phone: createPotentialUserDto.phone ?? existing.phone,
        sourceTenantId: createPotentialUserDto.sourceTenantId ?? existing.sourceTenantId,
        address: createPotentialUserDto.address ?? existing.address,
      });
      return await this.potentialUsersRepository.save(existing);
    }

    const potentialUser = this.potentialUsersRepository.create(createPotentialUserDto);
    return await this.potentialUsersRepository.save(potentialUser);
  }

  /**
   * Cliente rápido del negocio (venta directa / pedido en InOut): solo el
   * nombre es obligatorio. Si trae correo o teléfono de un cliente que el
   * negocio ya tiene, lo actualiza en vez de duplicarlo. Nunca toma el
   * registro de otro negocio (el correo es único en la tabla).
   */
  async createForTenant(tenantId: string, dto: CreateTenantCustomerDto): Promise<PotentialUser> {
    const name = dto.name.replace(/\s+/g, ' ').trim();
    if (name.length < 2) throw new BadRequestException('Escribe el nombre del cliente.');
    const email = dto.email?.trim().toLowerCase() || null;
    const phone = dto.phone?.trim() || null;
    const data = {
      name,
      ...(phone ? { phone } : {}),
      ...(dto.documentNumber?.trim() ? { documentNumber: dto.documentNumber.trim() } : {}),
      ...(dto.address?.trim() ? { address: dto.address.trim() } : {}),
    };

    if (email) {
      const byEmail = await this.potentialUsersRepository.findOne({ where: { email } });
      if (byEmail) {
        if (byEmail.sourceTenantId !== tenantId) {
          throw new ConflictException('Ese correo ya está registrado. Deja el correo vacío o usa otro.');
        }
        if (byEmail.status === PotentialUserStatus.CONVERTED) return byEmail;
        Object.assign(byEmail, data);
        return await this.potentialUsersRepository.save(byEmail);
      }
    }
    if (phone) {
      const byPhone = await this.potentialUsersRepository.findOne({ where: { phone, sourceTenantId: tenantId } });
      if (byPhone && byPhone.status !== PotentialUserStatus.CONVERTED) {
        Object.assign(byPhone, data, email && !byPhone.email ? { email } : {});
        return await this.potentialUsersRepository.save(byPhone);
      }
    }
    return await this.potentialUsersRepository.save(
      this.potentialUsersRepository.create({ ...data, email, sourceApplication: 'Inout', sourceTenantId: tenantId }),
    );
  }

  async findBySource(sourceApplication: string, sourceTenantId: string): Promise<PotentialUser[]> {
    return await this.potentialUsersRepository.find({
      where: { sourceApplication, sourceTenantId },
    });
  }

  /** Leads de un negocio, los más recientes primero. */
  async findBySourceTenant(sourceTenantId: string): Promise<PotentialUser[]> {
    return await this.potentialUsersRepository.find({
      where: { sourceTenantId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findByEmail(email: string): Promise<PotentialUser | null> {
    return await this.potentialUsersRepository.findOne({
      where: { email },
    });
  }

  async findById(id: number): Promise<PotentialUser | null> {
    return await this.potentialUsersRepository.findOne({
      where: { id },
    });
  }
}
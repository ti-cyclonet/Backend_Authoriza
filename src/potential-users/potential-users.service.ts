import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PotentialUser, PotentialUserStatus } from './potential-user.entity';
import { CreatePotentialUserDto } from './dto/create-potential-user.dto';

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
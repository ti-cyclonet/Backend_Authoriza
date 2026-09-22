import { Injectable } from '@nestjs/common';
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
   * Upsert por email: `email` es único en la tabla, así que un segundo
   * checkout de invitado con el mismo correo (mismo negocio u otro) debe
   * actualizar el lead existente en vez de fallar por violación de unicidad.
   * No pisa un registro ya CONVERTED (ya es un usuario real).
   */
  async create(createPotentialUserDto: CreatePotentialUserDto): Promise<PotentialUser> {
    const existing = await this.potentialUsersRepository.findOne({
      where: { email: createPotentialUserDto.email },
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
      });
      return await this.potentialUsersRepository.save(existing);
    }

    const potentialUser = this.potentialUsersRepository.create(createPotentialUserDto);
    return await this.potentialUsersRepository.save(potentialUser);
  }

  async findBySource(sourceApplication: string): Promise<PotentialUser[]> {
    return await this.potentialUsersRepository.find({
      where: { sourceApplication },
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
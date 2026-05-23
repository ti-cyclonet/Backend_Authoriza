import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDependency } from './entities/user-dependency.entity';
import { CreateUserDependencyDto } from './dto/create-user-dependency.dto';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { Contract } from '../contract/entities/contract.entity';

@Injectable()
export class UserDependenciesService {
  constructor(
    @InjectRepository(UserDependency)
    private userDependencyRepository: Repository<UserDependency>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
  ) {}

  async create(createUserDependencyDto: CreateUserDependencyDto): Promise<UserDependency> {
    const { principalUserId, dependentUserId } = createUserDependencyDto;

    // Verificar que no exista ya la relación
    const existing = await this.userDependencyRepository.findOne({
      where: { principalUserId, dependentUserId }
    });

    if (existing) {
      throw new ConflictException('Esta relación de dependencia ya existe');
    }

    const dependency = this.userDependencyRepository.create(createUserDependencyDto);
    return this.userDependencyRepository.save(dependency);
  }

  async findAll(): Promise<UserDependency[]> {
    return this.userDependencyRepository.find({
      relations: ['principalUser', 'dependentUser']
    });
  }

  async findDependentsByPrincipal(principalUserId: string): Promise<UserDependency[]> {
    return this.userDependencyRepository.find({
      where: { principalUserId },
      relations: ['dependentUser', 'dependentUser.basicData']
    });
  }

  async findPrincipalsByDependent(dependentUserId: string): Promise<UserDependency[]> {
    return this.userDependencyRepository.find({
      where: { dependentUserId },
      relations: ['principalUser', 'principalUser.basicData']
    });
  }

  async remove(id: string): Promise<void> {
    const dependency = await this.userDependencyRepository.findOne({ where: { id } });
    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    // Obtener los contratos del principal
    const principalContracts = await this.contractRepository.find({
      where: { user: { id: dependency.principalUserId } }
    });
    const contractIds = principalContracts.map(c => c.id);

    // Eliminar todos los roles del dependiente que estén asociados a contratos del principal
    if (contractIds.length > 0) {
      await this.userRoleRepository
        .createQueryBuilder()
        .delete()
        .from(UserRole)
        .where('"userId" = :dependentUserId', { dependentUserId: dependency.dependentUserId })
        .andWhere('"contractId" IN (:...contractIds)', { contractIds })
        .execute();
    }

    // Eliminar la relación de dependencia
    await this.userDependencyRepository.remove(dependency);
  }

  async deactivate(id: string): Promise<UserDependency> {
    const dependency = await this.userDependencyRepository.findOne({ where: { id } });
    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    // Obtener los contratos del principal
    const principalContracts = await this.contractRepository.find({
      where: { user: { id: dependency.principalUserId } }
    });
    const contractIds = principalContracts.map(c => c.id);

    // Desactivar los roles del dependiente asociados a contratos del principal
    if (contractIds.length > 0) {
      await this.userRoleRepository
        .createQueryBuilder()
        .update(UserRole)
        .set({ status: 'INACTIVE' })
        .where('"userId" = :dependentUserId', { dependentUserId: dependency.dependentUserId })
        .andWhere('"contractId" IN (:...contractIds)', { contractIds })
        .andWhere('status = :status', { status: 'ACTIVE' })
        .execute();
    }

    dependency.status = 'INACTIVE';
    return this.userDependencyRepository.save(dependency);
  }
}
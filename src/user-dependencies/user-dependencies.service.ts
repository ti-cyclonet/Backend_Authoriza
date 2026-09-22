import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDependency } from './entities/user-dependency.entity';
import { CreateUserDependencyDto } from './dto/create-user-dependency.dto';
import { UserRole } from '../user-roles/entities/user-role.entity';

@Injectable()
export class UserDependenciesService {
  constructor(
    @InjectRepository(UserDependency)
    private userDependencyRepository: Repository<UserDependency>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
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

  /**
   * Dependientes activos de un principal, con su rol vigente para un
   * contrato (ej. el contrato de InOut del admin en sesión). Usado por el
   * módulo "Usuarios" de cada app para listar el equipo real (no clientes
   * de venta) del tenant en sesión.
   */
  async findDependentsWithRoles(principalUserId: string, contractId?: string) {
    const dependencies = await this.userDependencyRepository.find({
      where: { principalUserId, status: 'ACTIVE' },
      relations: [
        'dependentUser',
        'dependentUser.basicData',
        'dependentUser.basicData.naturalPersonData',
        'dependentUser.basicData.legalEntityData',
        'dependentUser.basicData.documentType',
      ],
    });

    const result = [];
    for (const dep of dependencies) {
      const user = dep.dependentUser;
      if (!user) continue;

      const roleWhere: any = { userId: dep.dependentUserId, status: 'ACTIVE' };
      if (contractId) roleWhere.contractId = contractId;
      const roles = await this.userRoleRepository.find({
        where: roleWhere,
        relations: ['role'],
      });

      const basicData = user.basicData;
      result.push({
        dependencyId: dep.id,
        userId: user.id,
        email: user.strUserName,
        code: user.code,
        isActive: user.strStatus === 'ACTIVE',
        status: user.strStatus,
        isAuthorizedSigner: dep.isAuthorizedSigner,
        personType: basicData?.strPersonType || null,
        documentType: basicData?.documentType?.documentType || null,
        documentNumber: basicData?.documentNumber || null,
        firstName: basicData?.naturalPersonData?.firstName || null,
        secondName: basicData?.naturalPersonData?.secondName || null,
        firstSurname: basicData?.naturalPersonData?.firstSurname || null,
        secondSurname: basicData?.naturalPersonData?.secondSurname || null,
        phone: basicData?.legalEntityData?.contactPhone || basicData?.naturalPersonData?.phone || null,
        businessName: basicData?.legalEntityData?.businessName || null,
        createdAt: dep.createdAt,
        roles: roles.map((r) => ({
          id: r.roleId,
          name: r.role?.strName,
          description: r.role?.strDescription1,
        })),
      });
    }

    return result;
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
    await this.userDependencyRepository.remove(dependency);
  }

  async deactivate(id: string): Promise<UserDependency> {
    const dependency = await this.userDependencyRepository.findOne({ where: { id } });
    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }
    dependency.status = 'INACTIVE';
    return this.userDependencyRepository.save(dependency);
  }

  async updateSigner(id: string, isAuthorizedSigner: boolean): Promise<UserDependency> {
    const dependency = await this.userDependencyRepository.findOne({ where: { id } });
    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }
    dependency.isAuthorizedSigner = isAuthorizedSigner;
    return this.userDependencyRepository.save(dependency);
  }
}
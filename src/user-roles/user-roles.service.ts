import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from './entities/user-role.entity';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { Contract } from '../contract/entities/contract.entity';
import { User } from '../users/entities/user.entity';
import { Rol } from '../roles/entities/rol.entity';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Rol)
    private rolRepository: Repository<Rol>,
    @InjectRepository(UserDependency)
    private userDependencyRepository: Repository<UserDependency>,
  ) {}

  async create(createUserRoleDto: CreateUserRoleDto): Promise<UserRole> {
    const userRole = this.userRoleRepository.create(createUserRoleDto);
    return this.userRoleRepository.save(userRole);
  }

  async findByUser(userId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role', 'contract'],
    });
  }

  async findAll(): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      relations: ['role', 'contract'],
    });
  }

  async remove(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepository.delete({ userId, roleId });
  }

  async assignRole(dto: CreateUserRoleDto): Promise<UserRole> {
    // Si viene contractId, validar cupos disponibles
    if (dto.contractId) {
      await this.validateRoleAvailability(dto.contractId, dto.roleId);
    }
    
    const userRole = await this.create(dto);
    
    // Si se asigna adminInout de InOut, también asignar adminInout de FactoNet
    const role = await this.rolRepository.findOne({
      where: { id: dto.roleId },
      relations: ['strApplication']
    });
    
    if (role?.strName === 'adminInout' && role?.strApplication?.strName === 'Inout') {
      // Buscar el rol adminInvoices de FactoNet
      const factonetAdminInvoicesRole = await this.rolRepository.findOne({
        where: { strName: 'adminInvoices' },
        relations: ['strApplication']
      });
      
      if (factonetAdminInvoicesRole && factonetAdminInvoicesRole.strApplication?.strName === 'Factonet') {
        // Verificar si ya tiene el rol asignado
        const existingFactonetRole = await this.userRoleRepository.findOne({
          where: { 
            userId: dto.userId, 
            roleId: factonetAdminInvoicesRole.id,
            contractId: dto.contractId 
          }
        });
        
        if (!existingFactonetRole) {
          // Asignar automáticamente el rol adminInvoices de FactoNet
          const factonetUserRole = this.userRoleRepository.create({
            userId: dto.userId,
            roleId: factonetAdminInvoicesRole.id,
            contractId: dto.contractId,
            status: 'ACTIVE'
          });
          await this.userRoleRepository.save(factonetUserRole);
        }
      }
    }
    
    return userRole;
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.findByUser(userId);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    // Verificar si es el último administrador de Authoriza
    const isAuthorizaAdmin = await this.userRoleRepository.findOne({
      where: { userId, roleId },
      relations: ['role']
    });

    if (isAuthorizaAdmin?.role?.strName === 'adminAuthoriza') {
      const totalAdmins = await this.userRoleRepository.count({
        where: { roleId, status: 'ACTIVE' },
        relations: ['role']
      });

      if (totalAdmins <= 1) {
        throw new BadRequestException('No se puede desasignar el último administrador de Authoriza. Debe haber al menos un administrador activo.');
      }
    }

    return this.remove(userId, roleId);
  }

  async getAssignedCountByContractAndRole(contractId: string, roleId: string): Promise<number> {
    return this.userRoleRepository.count({
      where: { contractId, roleId, status: 'ACTIVE' }
    });
  }

  async validateRoleAvailability(contractId: string, roleId: string): Promise<void> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['package', 'package.configurations', 'package.configurations.rol']
    });

    if (!contract) {
      throw new BadRequestException('Contract not found');
    }

    const config = contract.package.configurations.find(c => c.rol.id === roleId);
    if (!config) {
      throw new BadRequestException('Role not found in contract package');
    }

    const assigned = await this.getAssignedCountByContractAndRole(contractId, roleId);
    
    if (assigned >= config.totalAccount) {
      throw new BadRequestException(`No hay cupos disponibles para este rol. Total: ${config.totalAccount}, Asignados: ${assigned}`);
    }
  }

  async getRoleAvailability(contractId: string): Promise<any[]> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['package', 'package.configurations', 'package.configurations.rol']
    });

    if (!contract) {
      throw new BadRequestException('Contract not found');
    }

    const availability = [];
    for (const config of contract.package.configurations) {
      const assigned = await this.getAssignedCountByContractAndRole(contractId, config.rol.id);
      availability.push({
        role: config.rol,
        total: config.totalAccount,
        assigned,
        available: config.totalAccount - assigned,
        price: config.price
      });
    }

    return availability;
  }

  async transferAdminRole(currentAdminId: string, newAdminEmail: string, contractId: string): Promise<{ message: string }> {
    const currentAdmin = await this.userRepository.findOne({ where: { id: currentAdminId } });
    if (!currentAdmin) throw new NotFoundException('Usuario actual no encontrado');

    let newAdmin = await this.userRepository.findOne({ where: { strUserName: newAdminEmail } });
    if (!newAdmin) throw new BadRequestException('El nuevo usuario debe existir previamente');

    const adminRole = await this.rolRepository.findOne({ where: { strName: 'adminAuthoriza' } });
    const ownerRole = await this.rolRepository.findOne({ where: { strName: 'accountOwner' } });
    
    if (!adminRole) throw new NotFoundException('Rol adminAuthoriza no encontrado');
    if (!ownerRole) throw new NotFoundException('Rol accountOwner no encontrado');

    // Buscar el registro de adminAuthoriza del usuario actual
    const currentAdminUserRole = await this.userRoleRepository.findOne({
      where: { userId: currentAdminId, roleId: adminRole.id, contractId }
    });

    if (!currentAdminUserRole) {
      throw new NotFoundException('Rol adminAuthoriza no encontrado para el usuario actual');
    }

    // Actualizar el rol de adminAuthoriza a accountOwner
    currentAdminUserRole.roleId = ownerRole.id;
    await this.userRoleRepository.save(currentAdminUserRole);

    // Validar cupos disponibles
    await this.validateRoleAvailability(contractId, adminRole.id);

    // Asignar adminAuthoriza al nuevo usuario
    const newUserRole = this.userRoleRepository.create({
      userId: newAdmin.id,
      roleId: adminRole.id,
      contractId,
      status: 'ACTIVE'
    });
    await this.userRoleRepository.save(newUserRole);

    const existingDependency = await this.userDependencyRepository.findOne({
      where: { principalUserId: currentAdminId, dependentUserId: newAdmin.id }
    });

    if (!existingDependency) {
      const dependency = this.userDependencyRepository.create({
        principalUserId: currentAdminId,
        dependentUserId: newAdmin.id,
        status: 'ACTIVE'
      });
      await this.userDependencyRepository.save(dependency);
    }

    return { message: 'Rol transferido exitosamente' };
  }

  async updateUserToAccountOwner(userId: string, contractId: string): Promise<void> {
    const accountOwnerRole = await this.rolRepository.findOne({ 
      where: { strName: 'accountOwner' } 
    });
    
    if (!accountOwnerRole) {
      throw new NotFoundException('Rol accountOwner no encontrado');
    }

    // Buscar el registro existente del usuario en user_roles
    const existingUserRole = await this.userRoleRepository.findOne({
      where: { userId, contractId }
    });

    if (existingUserRole) {
      // Actualizar el roleId existente
      existingUserRole.roleId = accountOwnerRole.id;
      await this.userRoleRepository.save(existingUserRole);
    } else {
      // Si no existe, crear nuevo registro
      const newUserRole = this.userRoleRepository.create({
        userId,
        roleId: accountOwnerRole.id,
        contractId,
        status: 'ACTIVE'
      });
      await this.userRoleRepository.save(newUserRole);
    }
  }
}
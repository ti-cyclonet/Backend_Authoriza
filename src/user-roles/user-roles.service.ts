import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from './entities/user-role.entity';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { Contract } from '../contract/entities/contract.entity';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
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
    return this.create(dto);
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.findByUser(userId);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
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
}
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDependency } from './entities/user-dependency.entity';
import { CreateUserDependencyDto } from './dto/create-user-dependency.dto';

@Injectable()
export class UserDependenciesService {
  constructor(
    @InjectRepository(UserDependency)
    private userDependencyRepository: Repository<UserDependency>,
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
}
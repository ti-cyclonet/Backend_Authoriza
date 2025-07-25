import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Rol } from 'src/roles/entities/rol.entity';
import { PaginationDto } from './dto/pagination.dto';
import { BasicData } from 'src/basic-data/entities/basic-data.entity';
import { NaturalPersonData } from 'src/natural-person-data/entities/natural-person-data.entity';
import { LegalEntityData } from 'src/legal-entity-data/entities/legal-entity-data.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Rol) private readonly rolRepository: Repository<Rol>,
  ) {}

  async create(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.strPassword, 10);
    const user = this.userRepository.create({
      strUserName: dto.strUserName,
      strPassword: hashedPassword,
      strStatus: 'UNCONFIRMED',
      dtmCreateDate: new Date(),
      dtmLatestUpdateDate: new Date(),
    });
    return this.userRepository.save(user);
  }

  async findAll(paginationDto: PaginationDto, dependentOnId?: string) {
    const { limit = 10, offset = 0 } = paginationDto;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.rol', 'rol')
      .leftJoinAndSelect('user.basicData', 'basicData')
      .leftJoinAndSelect('basicData.naturalPersonData', 'naturalPersonData')
      .leftJoinAndSelect('basicData.legalEntityData', 'legalEntityData')
      .leftJoinAndSelect('user.dependentOn', 'dependentOn')
      .leftJoinAndSelect('dependentOn.rol', 'dependentOnRol')
      .leftJoinAndSelect('dependentOn.basicData', 'dependentOnBasicData');

    if (dependentOnId) {
      qb.where('user.dependentOnId = :dependentOnId', { dependentOnId });
    }

    const users = await qb.take(limit).skip(offset).getMany();
    return plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }

  async findAllExcludingUserThatThisUserDependsOn(
    userId: string,
  ): Promise<UserResponseDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dependentOn'],
    });

    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.rol', 'rol')
      .leftJoinAndSelect('user.basicData', 'basicData')
      .leftJoinAndSelect('basicData.naturalPersonData', 'naturalPersonData')
      .leftJoinAndSelect('basicData.legalEntityData', 'legalEntityData')
      .leftJoinAndSelect('user.dependentOn', 'dependentOn')
      .leftJoinAndSelect('dependentOn.rol', 'dependentOnRol')
      .leftJoinAndSelect('dependentOn.basicData', 'dependentOnBasicData');

    if (user.dependentOn) {
      qb.where('user.id != :excludedId', { excludedId: user.dependentOn.id });
    }

    const users = await qb.getMany();
    return plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }

  async isUserNameTaken(userName: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { strUserName: userName },
    });
    return !!user;
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'rol',
        'basicData',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
        'dependentOn',
        'dependentOn.rol',
        'dependentOn.basicData',
      ],
    });
    if (!user) throw new NotFoundException('User not found');
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async assignRole(userId: string, roleId: string) {
    const user = await this.findOne(userId);
    const role = await this.rolRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    user.rol = role;
    user.dtmLatestUpdateDate = new Date();
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findOne({
      where: { strUserName: email },
      relations: [
        'rol',
        'basicData',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
        'dependentOn',
        'dependentOn.rol',
        'dependentOn.basicData',
      ],
    });
    if (!user) return null;
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findEntityByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { strUserName: email },
      relations: [
        'rol',
        'basicData',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
        'dependentOn',
        'dependentOn.rol',
        'dependentOn.basicData',
      ],
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.strUserName) user.strUserName = dto.strUserName;
    if (dto.strStatus) user.strStatus = dto.strStatus;

    if (dto.rolId) {
      const rol = await this.rolRepository.findOne({
        where: { id: dto.rolId },
      });
      if (!rol) throw new NotFoundException('Role not found');
      user.rol = rol;
    }

    if (dto.basicDataId) {
      const basicData = await this.userRepository.manager.findOne(BasicData, {
        where: { id: dto.basicDataId },
      });
      if (!basicData) throw new NotFoundException('BasicData not found');
      user.basicData = basicData;
    }

    if (dto.dependentOnId) {
      const dependentUser = await this.findOne(dto.dependentOnId);
      user.dependentOn = dependentUser;
    }

    user.dtmLatestUpdateDate = new Date();

    return await this.userRepository.save(user);
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.strPassword,
    );
    if (!isOldPasswordValid) {
      throw new NotFoundException('The old password is not valid.');
    }

    user.strPassword = await bcrypt.hash(newPassword, 10);
    user.dtmLatestUpdateDate = new Date();
    await this.userRepository.save(user);

    return { message: 'Password updated successfully!' };
  }

  async toggleStatus(userId: string): Promise<User> {
    const user = await this.findOne(userId);
    user.strStatus = user.strStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.userRepository.save(user);
  }

  async updateStatusWithDependents(
    userId: string,
    newStatus: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dependents'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Actualizar estado del usuario padre
    user.strStatus = newStatus;
    user.dtmLatestUpdateDate = new Date();
    await this.userRepository.save(user);

    // Actualizar estado de todos los hijos que dependan de este usuario
    await this.userRepository.update(
      { dependentOn: { id: userId } },
      {
        strStatus: newStatus,
        dtmLatestUpdateDate: new Date(),
      },
    );

    return user;
  }

  async removeRole(userId: string): Promise<User> {
    const user = await this.findOne(userId);
    user.rol = null;
    user.dtmLatestUpdateDate = new Date();
    return this.userRepository.save(user);
  }

  async removeDependency(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dependentOn'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    user.dependentOn = null;
    user.dtmLatestUpdateDate = new Date();

    return this.userRepository.save(user);
  }
}

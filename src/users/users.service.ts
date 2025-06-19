import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Rol } from 'src/roles/entities/rol.entity';
import { PaginationDto } from './dto/pagination.dto';
import { BasicData } from 'src/basic-data/entities/basic-data.entity';

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
      strStatus: 'ACTIVE',
      dtmCreateDate: new Date(),
      dtmLatestUpdateDate: new Date(),
    });
    return this.userRepository.save(user);
  }

  async findAll(paginationDto: PaginationDto, dependentOnId?: string) {
    const { limit = 10, offset = 0 } = paginationDto;

    const where: any = {};
    if (dependentOnId) {
      where.dependentOn = { id: dependentOnId };
    }

    return this.userRepository.find({
      where,
      take: limit,
      skip: offset,
      relations: ['rol', 'basicData', 'dependentOn'],
      select: ['id', 'strUserName', 'strStatus', 'dtmLatestUpdateDate'],
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['rol', 'basicData'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async assignRole(userId: string, roleId: string) {
    const user = await this.findOne(userId);
    const role = await this.rolRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    user.rol = role;
    user.dtmLatestUpdateDate = new Date();
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { strUserName: email },
      relations: ['rol', 'basicData'],
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
    const user = await this.findOne(userId);

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
}

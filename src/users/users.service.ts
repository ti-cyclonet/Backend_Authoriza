import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Rol } from 'src/roles/entities/rol.entity';

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
    });
    return this.userRepository.save(user);
  }

  async findAll() {
    return this.userRepository.find({ relations: ['rol'] });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['rol'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async assignRole(userId: string, roleId: string) {
    const user = await this.findOne(userId);
    const role = await this.rolRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    user.rol = role;
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { strUserName: email },
      relations: ['rol'],
    });
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
    await this.userRepository.save(user);

    // ✅ respuesta estructurada como objeto JSON
    return { message: 'Password updated successfully!' };
  }
}

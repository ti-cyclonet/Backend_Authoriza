import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BasicData } from './entities/basic-data.entity';
import { CreateBasicDataDto } from './dto/create-basic-data.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BasicDataService {
  constructor(
    @InjectRepository(BasicData)
    private readonly basicDataRepository: Repository<BasicData>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateBasicDataDto): Promise<BasicData> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const data = this.basicDataRepository.create({
      strPersonType: dto.strPersonType,
      strStatus: dto.strStatus,
      user,
    });

    // Guardamos primero los datos básicos
    const savedBasicData = await this.basicDataRepository.save(data);

    // Asignamos basicData al usuario y guardamos el usuario
    user.basicData = savedBasicData;
    await this.userRepository.save(user);

    return savedBasicData;
  }

  async findByUser(userId: string): Promise<BasicData | null> {
    return this.basicDataRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }
}

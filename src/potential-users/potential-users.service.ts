import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PotentialUser } from './potential-user.entity';
import { CreatePotentialUserDto } from './dto/create-potential-user.dto';

@Injectable()
export class PotentialUsersService {
  constructor(
    @InjectRepository(PotentialUser)
    private potentialUsersRepository: Repository<PotentialUser>,
  ) {}

  async create(createPotentialUserDto: CreatePotentialUserDto): Promise<PotentialUser> {
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
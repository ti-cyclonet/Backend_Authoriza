import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityCode } from '../entities/entity-code.entity';

@Injectable()
export class EntityCodeService {
  constructor(
    @InjectRepository(EntityCode)
    private entityCodeRepository: Repository<EntityCode>,
  ) {}

  async generateCode(entityType: string): Promise<string> {
    let entityCode = await this.entityCodeRepository.findOne({
      where: { entityType }
    });

    if (!entityCode) {
      const prefixMap = {
        'User': 'CU',
        'Invoice': 'DF',
        'Contract': 'DC',
        'Package': 'DP',
        'Application': 'AP',
        'Period': 'PE',
        'Rol': 'RO'
      };

      entityCode = this.entityCodeRepository.create({
        entityType,
        prefix: prefixMap[entityType] || 'XX',
        currentNumber: 0,
        digitLength: 5
      });
    }

    entityCode.currentNumber += 1;
    await this.entityCodeRepository.save(entityCode);

    const paddedNumber = entityCode.currentNumber.toString().padStart(entityCode.digitLength, '0');
    return `${entityCode.prefix}${paddedNumber}`;
  }

  async initializeEntityCodes(): Promise<void> {
    const entities = [
      { entityType: 'User', prefix: 'CU' },
      { entityType: 'Invoice', prefix: 'DF' },
      { entityType: 'Contract', prefix: 'DC' },
      { entityType: 'Package', prefix: 'DP' },
      { entityType: 'Application', prefix: 'AP' },
      { entityType: 'Period', prefix: 'PE' },
      { entityType: 'Rol', prefix: 'RO' }
    ];

    for (const entity of entities) {
      const exists = await this.entityCodeRepository.findOne({
        where: { entityType: entity.entityType }
      });

      if (!exists) {
        await this.entityCodeRepository.save({
          entityType: entity.entityType,
          prefix: entity.prefix,
          currentNumber: 0,
          digitLength: 5
        });
      }
    }
  }
}
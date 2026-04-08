import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserCleanupService {
  private readonly logger = new Logger(UserCleanupService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async deleteUnverifiedExpiredUsers(): Promise<void> {
    const now = new Date();

    // Solo eliminar usuarios que:
    // 1. No están verificados
    // 2. Tienen verificationExpires (pasaron por el flujo de registro nuevo)
    // 3. Su código ya expiró
    const expired = await this.userRepository.find({
      where: {
        isVerified: false,
        verificationExpires: LessThan(now),
        verificationCode: Not(IsNull()),
      },
    });

    if (expired.length === 0) return;

    this.logger.log(`Eliminando ${expired.length} usuario(s) no verificado(s) con código expirado...`);

    for (const user of expired) {
      try {
        // Eliminar relaciones dependientes antes del usuario
        await this.userRepository.manager.query(
          `DELETE FROM "basic_data" WHERE "userId" = $1`, [user.id]
        );
        await this.userRepository.manager.query(
          `DELETE FROM "user_roles" WHERE "userId" = $1`, [user.id]
        );
        await this.userRepository.manager.query(
          `DELETE FROM "user_dependencies" WHERE "dependentUserId" = $1 OR "principalUserId" = $1`, [user.id, user.id]
        );

        await this.userRepository.delete(user.id);
        this.logger.log(`Usuario eliminado: ${user.strUserName}`);
      } catch (err) {
        this.logger.error(`Error eliminando usuario ${user.strUserName}: ${err.message}`);
      }
    }
  }
}

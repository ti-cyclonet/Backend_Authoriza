import { Expose, Type } from 'class-transformer';
import { Rol } from '../../roles/entities/rol.entity';
import { BasicData } from '../../basic-data/entities/basic-data.entity';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  strUserName: string;

  @Expose()
  strStatus: string;

  @Expose()
  dtmLatestUpdateDate: Date;

  @Expose()
  @Type(() => Rol)
  rol: Rol;

  @Expose()
  @Type(() => BasicData)
  basicData: BasicData;
}

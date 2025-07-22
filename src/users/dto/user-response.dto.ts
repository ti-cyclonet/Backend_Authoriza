import { Expose, Type } from 'class-transformer';
import { RolResponseDto } from '../../roles/dto/rol-response.dto';
import { BasicDataResponseDto } from 'src/basic-data/dto/basic-data-responde.dto';

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
  @Type(() => RolResponseDto)
  rol: RolResponseDto;

  @Expose()
  @Type(() => BasicDataResponseDto)
  basicData: BasicDataResponseDto;

  @Expose()
  @Type(() => UserResponseDto)
  dependentOn?: UserResponseDto;
}

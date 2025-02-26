import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Asegúrate de importar el servicio ConfigService

@Module({
  providers: [ConfigService], // Asegúrate de incluirlo en los proveedores
  exports: [ConfigService], // Exporta ConfigService para poder usarlo en otros módulos
})
export class ConfigModule {}
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { DataSource } from 'typeorm';
import GlobalParametersSeed from './seeds/global-parameters.seed';
import InitialApplicationsSeed from './seeds/initial-applications.seed';
import UserSeed from './seeds/user.seed';
import InoutFreePackageSeed from './seeds/inout-free-package.seed';
import InoutProPackageSeed from './seeds/inout-pro-package.seed';
import InoutEnterprisePackageSeed from './seeds/inout-enterprise-package.seed';
import KiriPackagesSeed from './seeds/kiri-packages.seed';
import DevPackagesSeed from './seeds/dev-packages.seed';
import { seedCustomerParameters } from './seeds/customer-parameters.seed';
import InoutParametersSeed from './seeds/inout-parameters.seed';
import { NotificationsService } from './notifications/notifications.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: habilitar para todos los ambientes
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:4201',
      'http://localhost:4202',
      'http://localhost:4203',
      'http://localhost:9002',
      'http://localhost:9100',
      'http://localhost',
      'http://localhost:80',
      'https://cyclonet.com.co',
      'https://www.cyclonet.com.co',
      'https://kiri.cyclonet.com.co',
      'https://inout.cyclonet.com.co',
    ],
    credentials: true,
  });
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 🔹 Configuración de Swagger
  // -------------------------------------------
  const config = new DocumentBuilder()
    .setTitle('Documentation of the API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  // ----------------------------------------------


  // 🔹 Guard global (temporalmente deshabilitado)
  // const reflector = app.get(Reflector);
  // app.useGlobalGuards(new JwtAuthGuard(reflector));

  // 🔹 Límite de tamaño de payload (20 MB)
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  const dataSource = app.get(DataSource);
  
  // 👇 Ejecutar seeds antes de iniciar el servidor
  const globalParametersSeed = new GlobalParametersSeed();
  await globalParametersSeed.run(dataSource);
  const initialApplicationsSeed = new InitialApplicationsSeed();
  await initialApplicationsSeed.run(dataSource);
  const userSeed = new UserSeed();
  await userSeed.run(dataSource);

  const inoutFreePackageSeed = new InoutFreePackageSeed();
  await inoutFreePackageSeed.run(dataSource);

  const inoutProPackageSeed = new InoutProPackageSeed();
  await inoutProPackageSeed.run(dataSource);

  const inoutEnterprisePackageSeed = new InoutEnterprisePackageSeed();
  await inoutEnterprisePackageSeed.run(dataSource);

  const kiriPackagesSeed = new KiriPackagesSeed();
  await kiriPackagesSeed.run(dataSource);

  const devPackagesSeed = new DevPackagesSeed();
  await devPackagesSeed.run(dataSource);

  // Seed de plantillas de email
  const notificationsService = app.get(NotificationsService);
  await notificationsService.seedDefaultTemplates();

  // Seed de parámetros predefinidos de InOut
  const inoutParametersSeed = new InoutParametersSeed();
  await inoutParametersSeed.run(dataSource);
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend Authoriza escuchando en http://localhost:${port}`);

}

bootstrap();

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
import { seedCustomerParameters } from './seeds/customer-parameters.seed';
import { NotificationsService } from './notifications/notifications.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔹 Habilitar CORS
  app.enableCors({
    origin: [
      'http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202', 'http://localhost',
      'https://cyclonet.com.co', 'https://www.cyclonet.com.co',
      'https://auth.cyclonet.com.co', 'https://billing.cyclonet.com.co', 'https://app.cyclonet.com.co',
      'https://master.d249aa02o69249.amplifyapp.com', 'https://master.dccjshhnh1byc.amplifyapp.com', 'https://master.d31x1n66is2877.amplifyapp.com',
      'https://master.d2waotasrx21ny.amplifyapp.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization, x-tenant-id',
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

  // Seed de plantillas de email
  const notificationsService = app.get(NotificationsService);
  await notificationsService.seedDefaultTemplates();
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend Authoriza escuchando en http://localhost:${port}`);

}

bootstrap();

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔹 Habilitar CORS
  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
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


  // 🔹 Guard global
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // 🔹 Límite de tamaño de payload (20 MB)
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  const dataSource = app.get(DataSource);
  
  await app.listen(process.env.PORT ?? 3000);
  
  // 👇 Ejecutar seed de global_parameters
  const globalParametersSeed = new GlobalParametersSeed();
  await globalParametersSeed.run(dataSource);
  const initialApplicationsSeed = new InitialApplicationsSeed();
  await initialApplicationsSeed.run(dataSource);
  const userSeed = new UserSeed();
  await userSeed.run(dataSource);

}

bootstrap();

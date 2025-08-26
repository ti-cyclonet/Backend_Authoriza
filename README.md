<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="150" alt="Nest Logo" /></a>
</p>

<h1 align="center">Authoriza API Backend</h1>

<p align="center">
  Servicio de autenticación y autorización para la plataforma Ciclonets, construido con NestJS
</p>

## Descripción

Authoriza es un backend API que proporciona servicios de autenticación, autorización y gestión de usuarios para la plataforma C-Verse. El sistema está diseñado para manejar roles y permisos, además de conectarse con diferentes aplicaciones cliente.

## Características principales

- Autenticación segura mediante tokens JWT
- Sistema de roles y permisos granular
- Gestión completa de usuarios
- Documentación API automática con Swagger
- Integración con Cloudinary para la gestión de imágenes

## Requisitos previos

- Node.js (v14 o superior)
- Docker y Docker Compose
- PostgreSQL (a través de Docker)
- Yarn

## Instalación y configuración

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd Backend_Authoriza
```

### 2. Instalar dependencias
```bash
yarn install
```

### 3. Configurar variables de entorno
```bash
cp .env.template .env
```
Edite el archivo `.env` y configure las siguientes variables:
- `PORT`: Puerto donde se ejecutará la aplicación (por defecto: 3000)
- `DB_PASSWORD`: Contraseña para la base de datos PostgreSQL
- `DB_NAME`: Nombre de la base de datos
- `JWT_SECRET`: Clave secreta para la generación de tokens JWT
- `CLOUDINARY_CLOUD_NAME`: Nombre de su cuenta en Cloudinary
- `CLOUDINARY_API_KEY`: Clave API de Cloudinary
- `CLOUDINARY_API_SECRET`: Secreto API de Cloudinary

### 4. Iniciar la base de datos PostgreSQL
```bash
docker-compose up -d
```

### 5. Ejecutar la aplicación
```bash
# Modo desarrollo
yarn start:dev

# Modo producción
yarn build
yarn start:prod
```

## Documentación de la API

La documentación completa de la API está disponible a través de Swagger UI en la siguiente ruta:

```
http://localhost:3000/docs
```

Esta documentación se genera automáticamente y proporciona una interfaz interactiva para probar todos los endpoints disponibles.

## Estructura del proyecto

El proyecto está organizado en módulos específicos según la funcionalidad:

- `auth`: Gestión de autenticación y autorización
- `users`: Gestión de usuarios
- `roles`: Gestión de roles y permisos
- `applications`: Gestión de aplicaciones cliente
- `menuoptions`: Configuración de opciones de menú
- `basic-data`: Datos básicos del sistema
- `cloudinary`: Integración con Cloudinary para almacenamiento de imágenes

## Scripts disponibles

- `yarn start:dev`: Inicia la aplicación en modo desarrollo con reinicio automático
- `yarn build`: Compila la aplicación
- `yarn start:prod`: Inicia la aplicación en modo producción
- `yarn lint`: Ejecuta el linter para verificar el código
- `yarn test`: Ejecuta las pruebas unitarias
- `yarn test:e2e`: Ejecuta las pruebas end-to-end

## Licencia

Privada - Derechos reservados
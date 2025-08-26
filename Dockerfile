# Etapa 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar definiciones e instalar dependencias
COPY package*.json ./
COPY nest-cli.json ./
RUN npm install --legacy-peer-deps

# Copiar todo el código fuente
COPY . .

# Compilar el proyecto Nest.js
RUN ./node_modules/.bin/nest build

# Etapa 2: Imagen final
FROM node:18-alpine
WORKDIR /app

# Copiar el resultado del build y dependencias necesarias
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Variables de entorno y puerto expuesto
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Comando para ejecutar la app
CMD ["node", "dist/main"]

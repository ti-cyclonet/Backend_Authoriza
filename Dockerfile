# Etapa 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar archivos de definición e instalar dependencias
COPY package*.json ./
COPY nest-cli.json ./
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Ejecutar la compilación
RUN npx nest build

# Etapa 2: Imagen final de producción
FROM node:18-alpine
WORKDIR /app

# Copiar solo lo necesario
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Ejecutar la app
CMD ["node", "dist/main"]

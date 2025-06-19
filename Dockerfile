# Etapa 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código y compilar
COPY . .
RUN npm run build

# Etapa 2: Imagen final de producción
FROM node:18-alpine
WORKDIR /app

# Copiar sólo lo necesario
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Variables de entorno y puerto
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Iniciar app
CMD ["node", "dist/main"]
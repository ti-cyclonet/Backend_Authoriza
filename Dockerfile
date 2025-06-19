# Etapa 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar definiciones e instalar dependencias
COPY package*.json ./
COPY nest-cli.json ./
RUN npm install

# Copiar código fuente
COPY . .

# ⚠️ Usar npx directamente para evitar el error "nest not found"
RUN npx nest build

# Etapa 2: Producción
FROM node:18-alpine
WORKDIR /app

# Copiar build y node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Ejecutar aplicación
CMD ["node", "dist/main"]

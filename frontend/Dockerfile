# --- Etapa 1: Construcción (Node hardened) ---
FROM node:22-alpine AS build

# Actualizar el sistema base para corregir vulnerabilidades (CVEs)
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Instala dependencias
COPY package*.json ./
RUN npm install

# Copia el código y construye la aplicación
COPY . .
RUN npm run build

# --- Etapa 2: Producción con Nginx Endurecido ---
FROM nginxinc/nginx-unprivileged:stable-alpine

# Temporales de root para parchear el sistema base
USER root
RUN apk update && apk upgrade --no-cache

# Restaurar usuario sin privilegios para ejecución
USER nginx

# Copia los archivos estáticos generados por Vite
COPY --from=build /app/dist /usr/share/nginx/html

# Copia la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expone el puerto 8080 (no privilegiado)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

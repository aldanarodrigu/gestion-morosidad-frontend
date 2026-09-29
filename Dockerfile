# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime ----
# Imagen de nginx que corre sin root y escucha en el puerto 8080
FROM nginxinc/nginx-unprivileged:alpine

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Dirección del backend; se puede sobreescribir al ejecutar el contenedor
ENV API_UPSTREAM=http://api:8080
EXPOSE 8080

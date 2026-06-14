# ─── Produção: build CRA + nginx ─────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src ./src

RUN npm run build

# ─── Serve estáticos com proxy para a API ────────────────────
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

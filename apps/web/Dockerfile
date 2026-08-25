# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --no-audit --no-fund

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN npm run build -w @kanban/shared \
  && npm run build -w @kanban/web

# ---------- Serve stage (nginx) ----------
FROM nginx:1.27-alpine AS runner

COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Proxy /api y /ws hacia la API
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
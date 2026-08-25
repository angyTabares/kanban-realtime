# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Dependencias (caché por capa)
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --no-audit --no-fund

# Código
COPY packages/shared packages/shared
COPY apps/api apps/api

# Compila shared y api
RUN npm run build -w @kanban/shared \
  && npm run build -w @kanban/api

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/packages/shared packages/shared

WORKDIR /app/apps/api
EXPOSE 3000

CMD ["node", "dist/main.js"]
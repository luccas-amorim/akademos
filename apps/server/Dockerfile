# Contexto de build: raiz do repositório.
#   docker compose up --build
FROM node:24-slim AS build
WORKDIR /repo
RUN npm install -g pnpm@12.9.1
COPY . .
RUN pnpm install --frozen-lockfile --filter @akademos/server...
RUN pnpm --filter @akademos/server build
RUN pnpm --filter @akademos/server deploy --prod --legacy /out \
 && cp -r apps/server/dist apps/server/drizzle /out/ \
 && cp -r registry /out/registry

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    AKADEMOS_REGISTRO=/app/registry \
    PORT=8787
COPY --from=build /out .
USER node
EXPOSE 8787
HEALTHCHECK CMD node -e "fetch('http://localhost:8787/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]

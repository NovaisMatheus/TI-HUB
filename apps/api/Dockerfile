FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @hub/api build
USER node
CMD ["sh", "-c", "pnpm db:migrate && node apps/api/dist/main.js"]

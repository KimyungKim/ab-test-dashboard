# Stage 1: 의존성 설치
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma
RUN pnpm install --frozen-lockfile

# Stage 2: 빌드
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/database ./packages/database
COPY apps/api ./apps/api
RUN pnpm --filter @ab-test-dashboard/database generate
RUN pnpm --filter @ab-test-dashboard/api build

# Stage 3: 프로덕션 실행
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
ENV NODE_ENV=production
RUN wget -q -O /usr/local/share/aws-rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/aws-rds-ca-bundle.pem
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/database/package.json ./packages/database/
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist --ignore-scripts && \
    node node_modules/@prisma/engines/scripts/postinstall.js && \
    rm -rf /root/.local/share/pnpm/store
COPY --from=builder /app/packages/database/node_modules/.bin/prisma ./packages/database/node_modules/.bin/prisma
COPY --from=builder /app/packages/database/node_modules/prisma ./packages/database/node_modules/prisma
COPY --from=builder /app/packages/database/node_modules/@prisma ./packages/database/node_modules/@prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma.config.ts ./packages/database/prisma.config.ts
USER nestjs
EXPOSE 3001
ENV PORT=3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/main.js"]

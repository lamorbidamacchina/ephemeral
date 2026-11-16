FROM node:26-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app

# Run as an unprivileged user — the relay is internet-facing, so a bug in a
# dependency should not land an attacker as root inside the container.
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 wsuser

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder --chown=wsuser:nodejs /app/dist ./dist

USER wsuser
EXPOSE 3001
CMD ["node", "dist/index.js"]

# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma engines on Alpine need OpenSSL.
RUN apk add --no-cache openssl

# Install all dependencies (incl. dev) for building + Prisma/tsx tooling.
COPY package*.json ./
RUN npm install

# Generate Prisma client + compile TypeScript.
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Prisma engines on Alpine need OpenSSL at runtime too.
RUN apk add --no-cache openssl

# Reuse the installed deps + generated Prisma client from the build stage.
# (Keeps the Prisma CLI and tsx available so the entrypoint can run
#  migrations and the optional seed.)
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]

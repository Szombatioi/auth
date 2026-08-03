# Stage 1: Build
# Debian slim (glibc) rather than Alpine, so the native `bcrypt` module installs
# from a prebuilt binary instead of compiling from source.
FROM node:20-bookworm-slim AS builder

WORKDIR /app/auth

# @hangbank/shared is referenced via a tsconfig path (../shared) — needed at build time
COPY shared/ /app/shared/
COPY auth/package*.json ./
RUN npm install

COPY auth/ .
RUN npm run build

# Stage 2: Production
FROM node:20-bookworm-slim

WORKDIR /app/auth
ENV NODE_ENV=production

COPY --from=builder /app/auth/package*.json ./
COPY --from=builder /app/auth/node_modules ./node_modules
COPY --from=builder /app/auth/dist ./dist

EXPOSE 8888

# Output nests under dist/src because the shared types path lives outside src/
CMD ["node", "dist/src/main"]

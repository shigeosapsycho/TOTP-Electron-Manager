# Multi-stage Dockerfile for TOTP Electron Manager
# Cross-platform Electron builds without requiring platform-specific tools.
#
# Mac note: produces unsigned .zip (DMG requires macOS hdiutil).
# Windows note: requires Wine in the builder stage for NSIS.

# Stage 1: Build Environment
FROM node:20-bullseye AS builder

# Install build deps + Wine (for Windows NSIS target)
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    fakeroot \
    rpm \
    wine64 \
    wine32 \
    libwine \
    libnss3-dev \
    libgconf-2-4 \
    libx11-xcb1 \
    libxrender1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxshmfence1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files (frontend only - no root package.json in this repo)
COPY frontend/package*.json ./frontend/

# Install deps with linux-native binaries
WORKDIR /app/frontend
RUN npm ci

# Copy frontend sources (node_modules excluded via .dockerignore)
COPY frontend ./

# Build Next.js static export
RUN npm run build

# Stage 2: Minimal Runtime (dev/testing only)
FROM node:20-bullseye AS runtime

RUN apt-get update && apt-get install -y \
    libnss3 \
    libgconf-2-4 \
    libx11-xcb1 \
    libxrender1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/frontend ./frontend
WORKDIR /app/frontend
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "electron-dev"]

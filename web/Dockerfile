# Build stage
FROM node:20-slim AS builder

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root files for prisma
COPY prisma ./prisma/
COPY package*.json ./

# Copy web files
COPY web/package*.json ./web/

# Install root dependencies (for prisma)
RUN npm ci

# Install web dependencies
RUN cd web && npm ci

# Copy web source code
COPY web ./web/

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
# We need to pass build-time env vars if any, but for now we assume runtime env
RUN cd web && npm run build

# Final stage
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built assets and dependencies
COPY --from=builder /app/web/node_modules ./web/node_modules
COPY --from=builder /app/web/.next ./web/.next
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/package.json ./web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Drop privileges
USER node

# Start the application
CMD ["npm", "--prefix", "web", "start"]

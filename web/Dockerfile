# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy root prisma for client generation
COPY ../prisma ./prisma
COPY ../package*.json ./

# Copy web package files
COPY package*.json ./web/

# Install dependencies
RUN npm ci
RUN cd web && npm ci

# Copy web source code
COPY . ./web/

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN cd web && npm run build

# Final stage
FROM node:20-slim

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

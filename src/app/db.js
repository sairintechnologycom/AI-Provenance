import { PrismaClient } from '@prisma/client';

let prismaInstance;

/**
 * Initializes and returns the Prisma client.
 * Supports standard providers (SQLite, Postgres) via DATABASE_URL.
 */
export function getPrisma() {
  if (prismaInstance !== undefined) return prismaInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[DB] DATABASE_URL not set. Database features will be disabled.');
    prismaInstance = null;
    return null;
  }

  try {
    // Initialize standard Prisma client. 
    // It will use the provider specified in the schema and the DATABASE_URL from environment.
    prismaInstance = new PrismaClient();
    return prismaInstance;
  } catch (error) {
    console.error('[DB] Failed to initialize PrismaClient:', error.message);
    prismaInstance = null;
    return null;
  }
}

export const prisma = getPrisma();

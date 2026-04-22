import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from './crypto.js';

let prismaInstance;

/**
 * Initializes and returns the Prisma client.
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
    const basePrisma = new PrismaClient();
    
    // Apply field encryption extension
    prismaInstance = basePrisma.$extends({
      query: {
        account: {
          async create({ args, query }) {
            if (args.data.access_token) args.data.access_token = encrypt(args.data.access_token);
            if (args.data.refresh_token) args.data.refresh_token = encrypt(args.data.refresh_token);
            return query(args);
          },
          async update({ args, query }) {
            if (args.data.access_token) args.data.access_token = encrypt(args.data.access_token);
            if (args.data.refresh_token) args.data.refresh_token = encrypt(args.data.refresh_token);
            return query(args);
          },
          async upsert({ args, query }) {
            if (args.create.access_token) args.create.access_token = encrypt(args.create.access_token);
            if (args.create.refresh_token) args.create.refresh_token = encrypt(args.create.refresh_token);
            if (args.update.access_token) args.update.access_token = encrypt(args.update.access_token);
            if (args.update.refresh_token) args.update.refresh_token = encrypt(args.update.refresh_token);
            return query(args);
          }
        }
      },
      result: {
        account: {
          access_token: {
            needs: { access_token: true },
            compute(account) {
              return account.access_token ? decrypt(account.access_token) : null;
            }
          },
          refresh_token: {
            needs: { refresh_token: true },
            compute(account) {
              return account.refresh_token ? decrypt(account.refresh_token) : null;
            }
          }
        }
      }
    });

    return prismaInstance;
  } catch (error) {
    console.error('[DB] Failed to initialize PrismaClient:', error.message);
    prismaInstance = null;
    return null;
  }
}

export const prisma = getPrisma();

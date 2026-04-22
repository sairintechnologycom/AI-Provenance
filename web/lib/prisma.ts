import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "./crypto";

const globalForPrisma = global as unknown as { prisma: any };

const basePrisma = new PrismaClient({
  log: ["query"],
});

export { basePrisma };

export const prisma = basePrisma.$extends({
  query: {
    account: {
      async create({ args, query }: any) {
        if (args.data.access_token) args.data.access_token = encrypt(args.data.access_token);
        if (args.data.refresh_token) args.data.refresh_token = encrypt(args.data.refresh_token);
        return query(args);
      },
      async update({ args, query }: any) {
        if (args.data.access_token) args.data.access_token = encrypt(args.data.access_token);
        if (args.data.refresh_token) args.data.refresh_token = encrypt(args.data.refresh_token);
        return query(args);
      },
      async upsert({ args, query }: any) {
        if (args.create.access_token) args.create.access_token = encrypt(args.create.access_token);
        if (args.create.refresh_token) args.create.refresh_token = encrypt(args.create.refresh_token);
        if (args.update.access_token) args.update.update.access_token = encrypt(args.update.access_token);
        if (args.update.refresh_token) args.update.refresh_token = encrypt(args.update.refresh_token);
        return query(args);
      }
    }
  },
  result: {
    account: {
      access_token: {
        needs: { access_token: true },
        compute(account: any) {
          return account.access_token ? decrypt(account.access_token) : null;
        }
      },
      refresh_token: {
        needs: { refresh_token: true },
        compute(account: any) {
          return account.refresh_token ? decrypt(account.refresh_token) : null;
        }
      }
    }
  }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


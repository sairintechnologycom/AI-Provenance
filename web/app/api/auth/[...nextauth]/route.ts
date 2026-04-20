import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  logger: {
    error(code, metadata) {
      console.error(`[NextAuth Error] ${code}`, metadata);
    },
    warn(code) {
      console.warn(`[NextAuth Warn] ${code}`);
    },
    debug(code, metadata) {
      if (code === 'GET_AUTHORIZATION_URL') {
        console.log(`[NextAuth Debug] Auth URL generated with Client ID: ${process.env.GITHUB_ID?.substring(0, 5)}...`);
      }
    }
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = user.id;
        // @ts-ignore
        session.user.role = user.role;
        // @ts-ignore
        session.user.workspaceId = user.workspaceId;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };

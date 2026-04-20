import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // @ts-ignore - role is set in NextAuth session callback
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(leads);
  } catch (error: any) {
    console.error("[Admin Leads API Error]", error.message);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

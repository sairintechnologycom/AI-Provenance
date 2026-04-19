import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();

  // Basic admin check - for production we should check session.user.role === 'ADMIN'
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

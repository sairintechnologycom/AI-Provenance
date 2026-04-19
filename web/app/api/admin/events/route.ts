import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // @ts-ignore - role is set in NextAuth session callback
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const events = await prisma.appEvent.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(events);
  } catch (error: any) {
    console.error("[Admin Events API Error]", error.message);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

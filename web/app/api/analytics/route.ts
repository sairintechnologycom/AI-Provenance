import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const { event, payload } = await req.json();

  try {
    await prisma.appEvent.create({
      data: {
        event,
        payload: {
          ...payload,
          userId: session?.user?.email || "anonymous"
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Web Analytics Error]", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

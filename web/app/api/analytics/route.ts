import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  const session = await getServerSession();
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

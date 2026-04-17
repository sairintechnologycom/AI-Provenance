import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { note } = await req.json();

  if (!note) {
    return NextResponse.json({ error: "Approval note is required" }, { status: 400 });
  }

  try {
    const packet = await prisma.mergeBriefPacket.findUnique({
      where: { id: params.id },
      include: { pullRequest: true }
    });

    if (!packet) {
      return NextResponse.json({ error: "Packet not found" }, { status: 404 });
    }

    const updatedPr = await prisma.pullRequest.update({
      where: { id: packet.pullRequestId },
      data: {
        status: "APPROVED",
        approvalNote: note
      }
    });

    // Beta Instrumentation: Log approval event
    await prisma.appEvent.create({
      data: {
        event: 'reviewer_approved',
        payload: {
          packetId: params.id,
          prNumber: updatedPr.number,
          user: session.user.email,
          noteLength: note.length
        }
      }
    });

    return NextResponse.json({ success: true, pullRequest: updatedPr });
  } catch (error: any) {
    console.error("[Approval API Error]", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

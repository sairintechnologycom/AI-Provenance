import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, slackWebhookUrl } = await req.json();

  try {
    // @ts-ignore
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { workspace: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let workspace;
    if (user.workspaceId) {
      workspace = await prisma.workspace.update({
        where: { id: user.workspaceId },
        data: { name, slackWebhookUrl }
      });
    } else {
      workspace = await prisma.workspace.create({
        data: {
          name,
          slackWebhookUrl,
          users: { connect: { id: user.id } }
        }
      });
    }

    return NextResponse.json({ success: true, workspace });
  } catch (error: any) {
    console.error("[Settings API Error]", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, slackWebhookUrl } = await req.json();

    const user = await prisma.user.findUnique({
      // @ts-ignore
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
        data: { 
          name: name || undefined, 
          slackWebhookUrl 
        }
      });
    } else {
      // Create a default workspace if none exists
      workspace = await prisma.workspace.create({
        data: {
          name: name || "Default Workspace",
          slackWebhookUrl,
          users: { connect: { id: user.id } }
        }
      });
    }

    return NextResponse.json({ success: true, workspace });
  } catch (error: any) {
    console.error("[Settings API Error]", error.message);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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
    // Proxy the approval to the backend service which has the GitHub App context
    // This ensures both DB is updated AND GitHub Status Check is cleared.
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
    
    const response = await fetch(`${backendUrl}/api/packets/${params.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        note,
        username: session.user.email
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.error || "Backend approval failed" }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Approval Proxy Error]", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

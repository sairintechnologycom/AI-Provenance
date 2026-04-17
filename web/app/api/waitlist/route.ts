import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, company, role, teamSize, interest } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        company: company || "N/A",
        role: role || "N/A",
        teamSize: teamSize || "N/A",
        interest: interest || "N/A",
        source: "Landing Page"
      }
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error("[Waitlist API Error]", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

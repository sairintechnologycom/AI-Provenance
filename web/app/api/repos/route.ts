import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Basic Auth Check
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  const internalKey = process.env.INTERNAL_API_KEY || 'mergebrief_local_dev_secret';

  try {
    const res = await fetch(`${backendUrl}/api/repos`, {
      headers: {
        'x-api-key': internalKey,
        'x-workspace-id': (session.user as any).workspaceId || ''
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Backend error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

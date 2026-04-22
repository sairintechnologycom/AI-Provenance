import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isDemo = searchParams.get('demo') === 'true';
  const session = await getServerSession(authOptions);
  
  if (!session && !isDemo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = isDemo ? 'demo-workspace-id' : (session?.user as any).workspaceId || '';

  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  const internalKey = process.env.INTERNAL_API_KEY || 'mergebrief_local_dev_secret';

  try {
    const res = await fetch(`${backendUrl}/api/governance/stats`, {
      headers: {
        'x-api-key': internalKey,
        'x-workspace-id': workspaceId
      }
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

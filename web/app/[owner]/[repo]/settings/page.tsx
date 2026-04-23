import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PolicySettingsForm from '@/components/PolicySettingsForm';

export const dynamic = 'force-dynamic';

export default async function RepoSettings({ 
  params, 
  searchParams 
}: { 
  params: { owner: string, repo: string },
  searchParams?: { demo?: string }
}) {
  const session = await getServerSession(authOptions);
  const isDemo = searchParams?.demo === 'true';

  if (!session && !isDemo) {
    redirect('/api/auth/signin');
  }

  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  const internalKey = process.env.INTERNAL_API_KEY || 'mergebrief_local_dev_secret';
  const workspaceId = isDemo ? 'demo-workspace-id' : (session?.user as any)?.workspaceId || '';

  const res = await fetch(`${backendUrl}/api/repos/${params.owner}/${params.repo}`, { 
    cache: 'no-store',
    headers: {
      'x-api-key': internalKey,
      'x-workspace-id': workspaceId
    }
  });
  
  if (!res.ok) {
    return <div>Repository not found</div>;
  }
  
  const repo = await res.json();

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm font-medium text-white/40">
            <Link href={isDemo ? '/dashboard?demo=true' : '/dashboard'} className="hover:text-primary transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href={`/${params.owner}/${params.repo}${isDemo ? '?demo=true' : ''}`} className="hover:text-primary transition-colors">{params.owner}/{params.repo}</Link>
            <span>/</span>
            <span className="text-white/60">Settings</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
            Repository Settings
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <PolicySettingsForm 
            repoId={repo.id}
            currentPolicy={repo.policy}
            isDemo={isDemo}
          />
        </div>
        
        <aside className="space-y-6">
          <div className="glass-card p-8 space-y-4">
            <h3 className="text-sm font-black text-white/30 uppercase tracking-widest">Policy Modes</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-white mb-1">Observe</p>
                <p className="text-[10px] text-white/40 leading-relaxed">Runs analysis and posts reports, but never marks checks as failed.</p>
              </div>
              <div>
                <p className="text-xs font-bold text-white mb-1">Advisory</p>
                <p className="text-[10px] text-white/40 leading-relaxed">Warnings are visible. Critical risks are flagged but checks stay neutral/pass.</p>
              </div>
              <div>
                <p className="text-xs font-bold text-white mb-1">Block</p>
                <p className="text-[10px] text-white/40 leading-relaxed">Enforces strict gates. PRs with critical risk will fail status checks.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

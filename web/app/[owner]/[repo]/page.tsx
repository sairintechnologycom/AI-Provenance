import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RepoPullRequests({ params }: { params: { owner: string, repo: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  const res = await fetch(`${backendUrl}/api/repos/${params.owner}/${params.repo}/pulls`, { cache: 'no-store' });
  const pulls = res.ok ? await res.json() : [];

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm font-medium text-white/40">
            <Link href="/" className="hover:text-primary transition-colors">Dashboard</Link>
            <span>/</span>
            <span>{params.owner}</span>
            <span>/</span>
            <span className="text-white/60">{params.repo}</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
            {params.repo}
            <span className="text-lg font-normal text-white/20 tracking-normal">Pull Requests</span>
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          {pulls.length} TRACKED
        </div>
      </div>

      {pulls.length === 0 ? (
        <div className="glass-card p-20 text-center space-y-6">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
            <span className="text-4xl">📋</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No Pull Requests tracked yet</h3>
            <p className="text-white/40 max-w-sm mx-auto leading-relaxed">
              MergeBrief will begin analyzing PRs once activity is detected on this repository.
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">PR</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">AI Confidence</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Last Updated</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pulls.map((pr: any) => (
                <tr key={pr.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">#{pr.number}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest ${
                      pr.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      pr.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {pr.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                          style={{ width: `${pr.packet?.confidence ?? pr.confidence ?? 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-white">{pr.packet?.confidence ?? pr.confidence ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-xs text-white/40 font-medium">
                    {new Date(pr.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right">
                    {pr.packet ? (
                      <Link href={`/packets/${pr.packet.id}`} className="glass-button text-xs py-1.5 px-4 inline-flex hover:border-primary/50 group/btn">
                        <span>View Packet</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 transform group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ) : (
                      <span className="text-xs text-white/20 italic">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

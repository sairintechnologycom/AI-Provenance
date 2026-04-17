import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RepoPullRequests({ params }: { params: { owner: string, repo: string } }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/api/auth/signin');
  }

  const res = await fetch(`http://localhost:3000/api/repos/${params.owner}/${params.repo}/pulls`, { cache: 'no-store' });
  const pulls = res.ok ? await res.json() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          <Link href="/" className="text-blue-600 hover:underline">Dashboard</Link> / {params.owner} / {params.repo}
        </h2>
      </div>

      {pulls.length === 0 ? (
        <div className="p-8 bg-white border border-gray-200 rounded-lg text-center text-gray-500">
          No Pull Requests tracked for this repository yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pulls.map((pr: any) => (
                <tr key={pr.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{pr.number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      pr.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      pr.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {pr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{pr.packet?.confidence ?? pr.confidence ?? 0}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(pr.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {pr.packet ? (
                      <Link href={`/packets/${pr.packet.id}`} className="text-blue-600 hover:text-blue-900">
                        View Packet &rarr;
                      </Link>
                    ) : (
                      <span className="text-gray-400">No packet</span>
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

export const dynamic = 'force-dynamic';

export default async function Home() {
  const res = await fetch('http://localhost:3000/api/repos', { cache: 'no-store' });
  const repos = res.ok ? await res.json() : [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Tracked Repositories</h2>
      
      {repos.length === 0 ? (
        <div className="p-8 bg-white border border-gray-200 rounded-lg text-center text-gray-500">
          No repositories tracked yet. MergeBrief will track repositories automatically when webhooks are received.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo: any) => (
            <a 
              key={repo.id} 
              href={`/${repo.owner}/${repo.name}`}
              className="block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600">{repo.owner} / {repo.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Last activity: {new Date(repo.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

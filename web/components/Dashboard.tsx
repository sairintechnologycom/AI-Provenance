'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/repos')
      .then(res => res.json())
      .then(data => {
        setRepos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Tracked Repositories</h2>
        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded">Beta</span>
      </div>
      
      {repos.length === 0 ? (
        <div className="p-12 bg-white border border-gray-200 rounded-2xl text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <span className="text-2xl text-gray-400">📦</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No repositories active</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            MergeBrief will track repositories automatically when PR activity starts. Ensure the GitHub App is installed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo: any) => (
            <a 
              key={repo.id} 
              href={`/${repo.owner}/${repo.name}`}
              className="block p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition group border-l-4 border-l-transparent hover:border-l-blue-600"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600">{repo.owner} / {repo.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Last activity: {new Date(repo.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-gray-300 group-hover:text-blue-600 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

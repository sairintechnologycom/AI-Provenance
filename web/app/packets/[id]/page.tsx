import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PacketDetail({ params }: { params: { id: string } }) {
  const res = await fetch(`http://localhost:3000/api/packets/${params.id}`, { cache: 'no-store' });
  
  if (!res.ok) {
    return (
      <div className="p-8 bg-white border border-gray-200 rounded-lg text-center text-gray-500">
        Packet not found or still processing.
      </div>
    );
  }

  const packet = await res.json();
  const repo = packet.pullRequest.repository;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">MergeBrief Packet</h2>
          <p className="text-gray-500 mt-1">
            <Link href={`/${repo.owner}/${repo.name}`} className="text-blue-600 hover:underline">{repo.owner}/{repo.name}</Link>
            {' '}&bull; PR #{packet.pullRequest.number}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            packet.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            packet.status === 'FAILED' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {packet.status}
          </span>
          <p className="text-sm text-gray-500 mt-2">v{packet.version} &bull; {new Date(packet.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Summary analysis</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{packet.summary || 'No summary available.'}</p>
            
            {packet.intents?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-sm text-gray-900 uppercase tracking-wider mb-3">Semantic Intents</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  {packet.intents.map((intent: any) => (
                    <li key={intent.id}>{intent.detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Risk Overlay</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500 uppercase flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Deterministic Overlays
                  </h4>
                  {packet.tags.filter((t: any) => t.type === 'DETERMINISTIC').length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No deterministic risks triggered by file paths.</p>
                  ) : (
                    <div className="grid gap-3">
                      {packet.tags.filter((t: any) => t.type === 'DETERMINISTIC').map((tag: any) => (
                        <div key={tag.id} className="bg-blue-50 border border-blue-100 p-3 rounded flex flex-col">
                          <span className="font-semibold text-blue-800 mb-1">{tag.category}</span>
                          <span className="text-sm text-blue-600">{tag.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-medium text-sm text-gray-500 uppercase flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Inferred Risks (Blast Radius)
                  </h4>
                  {packet.tags.filter((t: any) => t.type === 'INFERRED').length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No additional inferred risks from LLM.</p>
                  ) : (
                    <div className="grid gap-3">
                      {packet.tags.filter((t: any) => t.type === 'INFERRED').map((tag: any) => (
                        <div key={tag.id} className="bg-purple-50 border border-purple-100 p-3 rounded flex flex-col">
                          <span className="font-semibold text-purple-800 mb-1">{tag.category}</span>
                          <span className="text-sm text-purple-600">{tag.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Authorship</h3>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold text-gray-900">{packet.confidence || 0}%</span>
              <span className="text-gray-500 mb-1">AI Evidence</span>
            </div>
            {packet.aiTool && (
              <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border border-gray-100">
                Primary Tool: <span className="font-bold">{packet.aiTool}</span>
              </p>
            )}
            
            {packet.provenanceEvidence?.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Evidence Sources</h4>
                <ul className="text-sm space-y-2">
                  {packet.provenanceEvidence.map((ev: any) => (
                    <li key={ev.id} className="flex justify-between text-gray-700">
                      <span>{ev.method}</span>
                      <span className="text-gray-500">{ev.confidence}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Review Routing</h3>
            {packet.reviewerSuggestions?.length > 0 ? (
              <ul className="space-y-3">
                {packet.reviewerSuggestions.map((rev: any) => (
                  <li key={rev.id} className="flex flex-col">
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        {rev.username[0].toUpperCase()}
                      </div>
                      @{rev.username}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 pl-8">{rev.reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No specific reviewers suggested.</p>
            )}
          </section>

          <details className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-sm">
            <summary className="font-semibold cursor-pointer text-gray-600">Raw Tool Payload</summary>
            <pre className="mt-4 p-4 bg-gray-50 overflow-x-auto text-xs text-gray-700 rounded border border-gray-100">
              {packet.rawPayload ? JSON.stringify(JSON.parse(packet.rawPayload), null, 2) : 'No raw data.'}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

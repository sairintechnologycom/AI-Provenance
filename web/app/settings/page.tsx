import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // @ts-ignore
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true }
  });

  if (!user) return <div>User not found.</div>;

  const workspace = user.workspace;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-2">Manage your workspace and notification preferences.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold">Workspace Configuration</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Workspace Name</label>
            <input 
              type="text" 
              defaultValue={workspace?.name || ""} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Engineering Team"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Slack Webhook URL</label>
            <input 
              type="url" 
              defaultValue={workspace?.slackWebhookUrl || ""} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://hooks.slack.com/services/..."
            />
            <p className="text-xs text-gray-400">Pushes PR summaries to this channel when packets are ready.</p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              Save Workspace Settings
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">Disconnecting your GitHub installation will stop all tracking and analysis.</p>
          <button className="text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition">
            Disconnect GitHub App
          </button>
        </div>
      </div>
    </div>
  );
}

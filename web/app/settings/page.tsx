import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: session.user.id },
    include: { workspace: true }
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="glass-card p-12 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Account Not Found</h2>
          <p className="text-white/40 mb-6">We couldn't retrieve your profile data. Please try signing in again.</p>
          <a href="/api/auth/signin" className="glass-button px-6 py-2">Re-authenticate</a>
        </div>
      </div>
    );
  }

  const workspace = user.workspace;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
      <div className="relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative">
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40 mb-3">
            Workspace Settings
          </h1>
          <p className="text-lg text-white/40 font-medium">
            Configure your governance environment and notification channels.
          </p>
        </div>
      </div>

      <SettingsForm initialWorkspace={workspace} />
    </div>
  );
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import AuthWrapper from '@/components/AuthWrapper';

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { demo?: string }
}) {
  // In Next.js App Router, searchParams is a plain object in Page components
  const isDemo = searchParams?.demo === 'true';
  const session = await getServerSession(authOptions);

  if (!session && !isDemo) {
    redirect('/');
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <AuthWrapper isDemo={isDemo} session={session}>
        <Dashboard />
      </AuthWrapper>
    </div>
  );
}

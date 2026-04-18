'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Workspace Settings', href: '/settings', icon: '⚙️' },
    { name: 'Waitlist Leads', href: '/admin/waitlist', icon: '📝' },
    { name: 'System Events', href: '/admin/events', icon: '📜' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">Administration</h1>
          <p className="text-white/40 font-medium">Global workspace configuration and lead management.</p>
        </div>
      </div>

      <nav className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive 
                  ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </Link>
          );
        })}
      </nav>

      <div className="animate-fade-in">
        {children}
      </div>
    </div>
  );
}

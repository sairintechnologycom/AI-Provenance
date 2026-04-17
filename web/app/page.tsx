'use client';

import { useSession } from "next-auth/react";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (session) {
    return <Dashboard />;
  }

  return <LandingPage />;
}

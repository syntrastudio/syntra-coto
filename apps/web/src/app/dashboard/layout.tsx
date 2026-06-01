'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Sidebar } from '@/components/Sidebar';
import { IntroTour } from '@/components/IntroTour';
import { HelpBot } from '@/components/HelpBot';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Sidebar />
        <main className="lg:pl-64">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
        <IntroTour />
        <HelpBot />
      </div>
    </ProtectedRoute>
  );
}

// Made with Bob

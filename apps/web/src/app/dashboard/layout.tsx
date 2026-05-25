'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:pl-64">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

// Made with Bob

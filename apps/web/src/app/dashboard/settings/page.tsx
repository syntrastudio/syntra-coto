'use client';

import { useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { Users, FileText, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'audit-logs' | 'general'>('users');

  // Solo super_admin y admin pueden acceder
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 dark:text-gray-400">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Configuración</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gestiona usuarios administrativos y consulta logs de auditoría
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Usuarios</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'audit-logs'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Audit Logs</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>General</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Gestión de Usuarios</h2>
            <p className="text-gray-600 dark:text-gray-400">Componente de usuarios en desarrollo...</p>
          </div>
        )}

        {activeTab === 'audit-logs' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Logs de Auditoría</h2>
            <p className="text-gray-600 dark:text-gray-400">Componente de audit logs en desarrollo...</p>
          </div>
        )}

        {activeTab === 'general' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Configuración General</h2>
            <p className="text-gray-600 dark:text-gray-400">Configuración general en desarrollo...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob

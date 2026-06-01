'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Building2,
  Users,
  Receipt,
  CreditCard,
  Car,
  Settings,
  Wallet,
  BookOpen,
  Ticket,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from './ThemeToggle';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['super_admin', 'admin', 'supervisor', 'resident'] },
  { name: 'Propiedades', href: '/dashboard/properties', icon: Building2, roles: ['super_admin', 'admin', 'supervisor'] },
  { name: 'Residentes', href: '/dashboard/residents', icon: Users, roles: ['super_admin', 'admin', 'supervisor'] },
  { name: 'Vehículos', href: '/dashboard/vehicles', icon: Car, roles: ['super_admin', 'admin', 'supervisor'] },
  { name: 'Cuotas', href: '/dashboard/fees', icon: Receipt, roles: ['super_admin', 'admin', 'supervisor'] },
  { name: 'Pagos', href: '/dashboard/payments', icon: CreditCard, roles: ['super_admin', 'admin', 'supervisor'] },
  { name: 'Mesa / Caja', href: '/dashboard/mesa', icon: Wallet, roles: ['super_admin', 'admin'] },
  { name: 'Tickets', href: '/dashboard/tickets', icon: Ticket, roles: ['super_admin', 'admin', 'supervisor'] },
  { name: 'Reglamento', href: '/dashboard/reglamento', icon: BookOpen, roles: ['super_admin', 'admin', 'supervisor', 'resident'] },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings, roles: ['super_admin', 'admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg transition-colors"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        ) : (
          <Menu className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-500">Paseo Coto</h1>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-semibold">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation.map((item) => {
              // Filtrar por rol del usuario
              if (!item.roles.includes(user?.role as any)) {
                return null;
              }

              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// Made with Bob

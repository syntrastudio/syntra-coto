import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Paseo Coto Tonalá - Sistema de Administración',
  description: 'Sistema de administración del fraccionamiento Paseo Coto Tonalá',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') ||
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', theme === 'dark');
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
            <Toaster
              position="top-center"
              richColors
              closeButton
              duration={5000}
              toastOptions={{ style: { fontSize: '15px' } }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Made with Bob

'use client';
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import { PortfolioProvider } from '@/contexts/PortfolioContext';

const getTitle = (pathname: string) => {
  if (pathname.includes('/dashboard/portfolio')) return 'Portafolio';
  if (pathname.includes('/dashboard/bonds')) return 'Bonos';
  if (pathname.includes('/dashboard/deposits')) return 'Plazos Fijos';
  if (pathname.includes('/dashboard/scoop')) return 'Scoop';
  if (pathname.includes('/dashboard/goals')) return 'Mis Metas';
  if (pathname.includes('/dashboard/taxes')) return 'Impuestos';
  if (pathname.includes('/dashboard/start')) return 'Primeros Pasos';
  return 'Dashboard';
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const title = getTitle(pathname);

  return (
    <PortfolioProvider>
      <div className="flex h-screen bg-gray-100">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex justify-between items-center p-4 bg-white border-b">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 focus:outline-none lg:hidden">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
            <div />
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </PortfolioProvider>
  );
} 
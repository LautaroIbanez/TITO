"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { getSessionData, clearSessionData } from '@/utils/sessionStorage';

const navItems = [
  { label: "🏠 Resumen", href: "/dashboard" },
  { label: "🧠 Cómo funciona", href: "/dashboard/how-it-works" },
  { label: "🚀 Cómo empezar", href: "/dashboard/start" },
  { label: "📊 Portfolio", href: "/dashboard/portfolio" },
  { label: "🕵️ Acciones", href: "/dashboard/scoop" },
  { label: "📜 Bonos", href: "/dashboard/bonds" },
  { label: "💎 Criptomonedas", href: "/dashboard/crypto" },
  { label: "⏳ Plazos Fijos", href: "/dashboard/deposits" },
  { label: "🏦 Cauciones", href: "/dashboard/cauciones" },
  { label: "🏠 Bienes Raíces", href: "/dashboard/real-estate" },
  { label: "👤 Mi Perfil", href: "/dashboard/user" },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const sessionData = getSessionData();
    if (sessionData) {
      setUsername(sessionData.username);
    }
  }, []);

  const handleLogout = () => {
    clearSessionData();
    router.push('/login');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative flex flex-col h-full w-60 bg-gray-900 text-white shadow-lg z-30 transform transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex-1 flex flex-col gap-2 pt-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)} // Close sidebar on navigation
              className={`px-6 py-3 rounded-l-lg text-base font-medium transition-colors duration-150 hover:bg-gray-800 hover:text-blue-400 ${
                pathname === item.href ? "bg-gray-800 text-blue-400" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-auto mb-4 px-6">
          <div className="border-t border-gray-700 pt-4 flex flex-col gap-2">
            <span className="text-sm text-gray-400">User: <span className="text-white">{username}</span></span>
            <button onClick={handleLogout} className="text-xs text-red-400 hover:underline text-left">Logout</button>
          </div>
        </div>
      </aside>
    </>
  );
} 
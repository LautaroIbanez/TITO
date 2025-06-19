"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "🚀 Cómo empezar", href: "/dashboard/start" },
  { label: "📊 Portfolio", href: "/dashboard/portfolio" },
  { label: "🕵️ Scoop", href: "/dashboard/scoop" },
  { label: "🧾 Impuestos", href: "/dashboard/taxes" },
  { label: "🎯 Metas", href: "/dashboard/goals" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex flex-col h-full w-60 bg-gray-900 text-white shadow-lg">
      <div className="flex-1 flex flex-col gap-2 pt-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-6 py-3 rounded-l-lg text-base font-medium transition-colors duration-150 hover:bg-gray-800 hover:text-blue-400 ${
              pathname === item.href ? "bg-gray-800 text-blue-400" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mt-auto mb-4 px-6">
        {/* Placeholder for username or logout */}
        <div className="border-t border-gray-700 pt-4 flex flex-col gap-2">
          <span className="text-sm text-gray-400">User: <span className="text-white">username</span></span>
          <button className="text-xs text-red-400 hover:underline">Logout</button>
        </div>
      </div>
    </aside>
  );
} 
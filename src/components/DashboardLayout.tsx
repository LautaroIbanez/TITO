import Sidebar from "./Sidebar";
import Disclaimer from "./Disclaimer";
import { PortfolioProvider } from "@/contexts/PortfolioContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 mb-12">
          {children}
        </main>
        <Disclaimer />
      </div>
    </PortfolioProvider>
  );
} 
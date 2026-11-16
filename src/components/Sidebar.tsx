import {
  BarChart3,
  Boxes,
  Cpu,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { AdminProfile } from '../types/retail';

export type NavSectionId =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'pricing'
  | 'ml'
  | 'trends'
  | 'admin';

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (id: NavSectionId) => void;
  alertCount: number;
  admin: AdminProfile;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSectionId;
  label: string;
  Icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Overview', Icon: LayoutDashboard },
  { id: 'products', label: 'Archive & SKUs', Icon: Package },
  { id: 'inventory', label: 'Stock Alerts', Icon: Boxes },
  { id: 'sales', label: 'Sales Ledger', Icon: BarChart3 },
  { id: 'pricing', label: 'Markdowns', Icon: Tag },
  { id: 'ml', label: 'Demand ML', Icon: Cpu },
  { id: 'trends', label: 'Drop Trends', Icon: TrendingUp },
  { id: 'admin', label: 'Store Ops', Icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  alertCount,
  admin,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (
    <div className="h-full flex flex-col bg-[#111111] border-r border-[#242424] w-60 text-white">
      <div className="h-16 px-6 flex items-center justify-between border-b border-[#242424] shrink-0">
        <span className="font-display text-xl font-bold tracking-tight uppercase text-white whitespace-nowrap">
          AtelierMetrics
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-none text-white/60 hover:text-white hover:bg-[#1F1F1F]"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto" aria-label="Primary Workspace">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                onSelectSection(id);
                onCloseMobile();
              }}
              className={`relative w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-none text-[13px] font-medium transition-colors cursor-pointer ${
                active ? 'text-white' : 'text-[#A3A39E] hover:text-white hover:bg-[#1C1C1C]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="active-nav-fixture"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 bg-[#E53E1D] z-0"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate whitespace-nowrap">{label}</span>
              </span>
              {id === 'inventory' && alertCount > 0 && (
                <span
                  className={`relative z-10 font-mono text-xs tabular-nums shrink-0 ${
                    active ? 'text-white font-semibold' : 'text-[#FF6B4A] font-semibold'
                  }`}
                >
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#242424] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#222222] border border-[#383838] flex items-center justify-center font-mono text-xs font-medium text-white shrink-0">
            {admin.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-white truncate">{admin.name}</div>
            <div className="text-[11px] text-[#8E8E88] truncate">{admin.role}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-2 rounded-none text-[#8E8E88] hover:text-white hover:bg-[#1C1C1C] transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 relative z-20">{navContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}

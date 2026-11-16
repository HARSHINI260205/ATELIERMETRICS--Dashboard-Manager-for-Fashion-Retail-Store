import { Download, Menu, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { NavSectionId } from './Sidebar';

interface TopBarProps {
  activeSection: NavSectionId;
  onOpenMobileMenu: () => void;
  onRecordSale: () => void;
  onExportReport: () => void;
}

const SECTION_TITLES: Record<NavSectionId, string> = {
  dashboard: 'Executive Overview',
  products: 'Archive & SKU Catalog',
  inventory: 'Stock & Threshold Alerts',
  sales: 'Sales Performance Ledger',
  pricing: 'Markdown & Price Elasticity',
  ml: 'Random Forest Demand Prediction',
  trends: 'Seasonal Drop Trends',
  admin: 'Store Ops & Administration',
};

export function TopBar({
  activeSection,
  onOpenMobileMenu,
  onRecordSale,
  onExportReport,
}: TopBarProps) {
  return (
    <header className="h-16 bg-[#F5F5F2]/85 backdrop-blur-sm border-b border-[#D4D4CE] px-4 sm:px-8 flex items-center justify-between gap-8 shrink-0 relative z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-none text-[#555552] hover:text-[#111111] hover:bg-[#E2E2DC]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 text-sm min-w-0">
          <span className="text-xs font-mono tracking-[0.12em] uppercase text-[#666664] whitespace-nowrap shrink-0">
            AW26 · DROP 04
          </span>
          <span className="text-[#B8B8B2]" aria-hidden="true">
            /
          </span>
          <AnimatePresence mode="wait">
            <motion.h1
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-xl font-semibold uppercase tracking-tight text-[#111111] truncate"
            >
              {SECTION_TITLES[activeSection]}
            </motion.h1>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onExportReport}
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-medium text-[#111111] bg-white border border-[#C8C8C2] rounded-none hover:border-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Export CSV</span>
        </button>
        <button
          type="button"
          onClick={onRecordSale}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider font-medium text-white bg-[#111111] rounded-none hover:bg-[#E53E1D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Record Sale</span>
        </button>
      </div>
    </header>
  );
}

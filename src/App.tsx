import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { InteractiveBackdrop } from './components/InteractiveBackdrop';
import { LoginView } from './components/LoginView';
import { RecordSaleModal } from './components/RecordSaleModal';
import { Sidebar, type NavSectionId } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import type { AdminProfile, InventoryAlert, Product, ProductForecast } from './types/retail';
import { apiFetch, downloadCsv, setStoredToken } from './utils/api';
import { AdminSettingsView } from './views/AdminSettingsView';
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { MLPredictionView } from './views/MLPredictionView';
import { PricingOptimizationView } from './views/PricingOptimizationView';
import { ProductsView } from './views/ProductsView';
import { SalesAnalyticsView } from './views/SalesAnalyticsView';
import { TrendsView } from './views/TrendsView';

export default function App() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeSection, setActiveSection] = useState<NavSectionId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [refreshSignal, setRefreshSignal] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [recordSaleOpen, setRecordSaleOpen] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshSignal((s) => s + 1);
  }, []);

  useEffect(() => {
    apiFetch<{ admin: AdminProfile }>('/api/auth/me')
      .then((res) => setAdmin(res.admin))
      .catch(() => setAdmin(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (!admin) return;
    apiFetch<{ products: Product[]; alerts: InventoryAlert[] }>('/api/inventory')
      .then((res) => {
        setProducts(res.products);
        setAlertCount(
          res.alerts.filter((a) => a.severity === 'Critical' || a.severity === 'Warning').length,
        );
      })
      .catch(() => {});
  }, [admin, refreshSignal]);

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setStoredToken(null);
    setAdmin(null);
  };

  const handleExportReport = async () => {
    const res = await apiFetch<{ forecasts: ProductForecast[] }>('/api/ml/predictions');
    downloadCsv(
      'ateliermetrics-ml-demand-report.csv',
      [
        'SKU',
        'Product Name',
        'Category',
        'Season',
        'Current Stock',
        'Reorder Point',
        'Next Month ML Forecast',
        'Quarter Forecast',
        'Demand Tier',
        'Stock Status',
        'Recommended Order Qty',
      ],
      res.forecasts.map((f) => [
        f.sku,
        f.name,
        f.category,
        f.season,
        f.currentStock,
        f.reorderPoint,
        f.predictedMonth1,
        f.totalNextQuarterDemand,
        f.demandTier,
        f.stockStatus,
        f.recommendedOrderQty,
      ]),
    );
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#EAEAE6] flex items-center justify-center text-xs font-mono tracking-[0.14em] uppercase text-[#555552]">
        Loading Retail Console...
      </div>
    );
  }

  if (!admin) {
    return <LoginView onSuccess={(loggedInAdmin) => setAdmin(loggedInAdmin)} />;
  }

  return (
    <div className="min-h-screen bg-[#EAEAE6] flex relative overflow-x-hidden">
      <InteractiveBackdrop activeKey={activeSection} variant="light" />

      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        alertCount={alertCount}
        admin={admin}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <TopBar
          activeSection={activeSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onRecordSale={() => setRecordSaleOpen(true)}
          onExportReport={handleExportReport}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeSection === 'dashboard' && (
                <DashboardView
                  refreshSignal={refreshSignal}
                  onNavigate={setActiveSection}
                  onDataChanged={triggerRefresh}
                />
              )}
              {activeSection === 'products' && (
                <ProductsView refreshSignal={refreshSignal} onDataChanged={triggerRefresh} />
              )}
              {activeSection === 'inventory' && (
                <InventoryView refreshSignal={refreshSignal} onDataChanged={triggerRefresh} />
              )}
              {activeSection === 'sales' && <SalesAnalyticsView refreshSignal={refreshSignal} />}
              {activeSection === 'pricing' && (
                <PricingOptimizationView refreshSignal={refreshSignal} onDataChanged={triggerRefresh} />
              )}
              {activeSection === 'ml' && <MLPredictionView refreshSignal={refreshSignal} />}
              {activeSection === 'trends' && <TrendsView refreshSignal={refreshSignal} />}
              {activeSection === 'admin' && (
                <AdminSettingsView
                  admin={admin}
                  onExportFullReport={handleExportReport}
                  onDataReset={triggerRefresh}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {recordSaleOpen && (
        <RecordSaleModal
          products={products}
          onClose={() => setRecordSaleOpen(false)}
          onSaleRecorded={triggerRefresh}
        />
      )}
    </div>
  );
}

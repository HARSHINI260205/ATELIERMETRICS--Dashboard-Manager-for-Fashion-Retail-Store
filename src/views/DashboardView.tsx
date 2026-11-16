import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NavSectionId } from '../components/Sidebar';
import { ProductThumb, SemanticStatus, VelocityIndicator } from '../components/StatusText';
import type { DashboardSummary, Product, ProductForecast } from '../types/retail';
import { apiFetch, formatCurrency, formatNumber } from '../utils/api';

interface DashboardViewProps {
  refreshSignal: number;
  onNavigate: (section: NavSectionId) => void;
  onDataChanged: () => void;
}

export function DashboardView({ refreshSignal, onNavigate, onDataChanged }: DashboardViewProps) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [featuredLookbook, setFeaturedLookbook] = useState<
    Array<{ product: Product; forecast?: ProductForecast }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, prodRes, mlRes] = await Promise.all([
        apiFetch<DashboardSummary>('/api/dashboard'),
        apiFetch<{ products: Product[] }>('/api/products'),
        apiFetch<{ forecasts: ProductForecast[] }>('/api/ml/predictions'),
      ]);
      setData(dashRes);
      const fcMap = new Map(mlRes.forecasts.map((f) => [f.productId, f]));
      const featured = prodRes.products.slice(0, 5).map((product) => ({
        product,
        forecast: fcMap.get(product.id),
      }));
      setFeaturedLookbook(featured);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshSignal]);

  const handleApplyRecommendation = async (
    productId: string,
    suggestedPrice: number,
    suggestedDiscountPct: number,
  ) => {
    setApplyingId(productId);
    try {
      await apiFetch('/api/pricing/apply', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          basePrice: suggestedPrice,
          discountPct: suggestedDiscountPct,
        }),
      });
      await load();
      onDataChanged();
    } finally {
      setApplyingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white border border-[#E0E0DC] rounded-none animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-white border border-[#E0E0DC] rounded-none animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-white border border-[#FECACA] rounded-none text-sm text-[#B91C1C]">
        {error || 'Dashboard data unavailable.'}
      </div>
    );
  }

  const { kpis } = data;

  return (
    <div className="space-y-8">
      {/* Editorial Drop Masthead */}
      <section className="border-b border-[#111111] pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.14em] text-[#E53E1D]">
            Drop 04 · AW26 · Streetwear Operations
          </div>
          <h2 className="mt-1.5 font-display text-4xl sm:text-5xl font-semibold uppercase tracking-tight text-[#111111] leading-[0.95]">
            Collection Demand &amp; Stock Position
          </h2>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#555552]">
          <span>
            Engine <span className="font-mono text-[#111111]">Random Forest (40 Trees)</span>
          </span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="text-[#111111] font-mono uppercase tracking-wider font-medium underline underline-offset-4 hover:text-[#E53E1D] cursor-pointer whitespace-nowrap"
          >
            Open Archive
          </button>
        </div>
      </section>

      {/* KPI Summary Row (with Stark Black + Signal Vermilion Anchor) */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-[#666664]">
            14-Month Gross Revenue
          </div>
          <div className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#111111] tabular-nums">
            {formatCurrency(kpis.totalRevenue)}
          </div>
          <div className="mt-2 pt-2 border-t border-[#EBEBE6] text-xs text-[#666664] font-mono tabular-nums">
            {formatNumber(kpis.totalUnitsSold)} units sold
          </div>
        </div>

        <div className="bg-white border border-[#D4D4CE] rounded-none p-5 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-[#666664]">
            Active Stock Valuation
          </div>
          <div className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#111111] tabular-nums">
            {formatCurrency(kpis.inventoryValuation)}
          </div>
          <div className="mt-2 pt-2 border-t border-[#EBEBE6] text-xs text-[#666664]">
            Retail value across active SKUs
          </div>
        </div>

        <div className="bg-[#111111] border border-[#111111] rounded-none p-5 text-white flex flex-col justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-white/70">
            ML Next-Month Demand
          </div>
          <div className="mt-3 font-display text-4xl font-semibold tracking-tight text-white tabular-nums">
            {formatNumber(kpis.projectedNextMonthUnits)}{' '}
            <span className="text-lg font-normal text-white/70">UNITS</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/15 text-xs text-[#FF6B4A] font-mono tabular-nums">
            Random Forest R² = {kpis.mlR2Score.toFixed(3)}
          </div>
        </div>

        <div className="bg-white border border-[#D4D4CE] rounded-none p-5 flex flex-col justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-[#666664]">
            Inventory Stock Alerts
          </div>
          <div className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#111111] tabular-nums">
            {kpis.lowStockAlertCount}{' '}
            <span className="text-lg font-normal text-[#666664]">SKUS</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#EBEBE6]">
            {kpis.lowStockAlertCount > 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-xs font-mono uppercase tracking-wider font-medium text-[#E53E1D] hover:underline underline-offset-4 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Review Triggers</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            ) : (
              <SemanticStatus label="All thresholds nominal" tone="nominal" />
            )}
          </div>
        </div>
      </section>

      {/* Streetwear Archive Contact-Sheet Strip */}
      {featuredLookbook.length > 0 && (
        <section aria-label="Core Archive Contact Sheet">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono uppercase tracking-[0.12em] text-[#555552]">
              Core Archive · Key Silhouettes
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('ml')}
              className="text-xs font-mono uppercase tracking-wider font-medium text-[#111111] underline underline-offset-4 hover:text-[#E53E1D] cursor-pointer"
            >
              All 12 Forecasts
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredLookbook.map(({ product, forecast }, idx) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onNavigate('products')}
                className="group text-left bg-white border border-[#D4D4CE] hover:border-[#111111] transition-colors cursor-pointer"
              >
                <div className="relative overflow-hidden bg-[#F2F2EE]">
                  <ProductThumb
                    name={product.name}
                    colorHex={product.colorHex}
                    category={product.category}
                    sku={product.sku}
                    size="lg"
                  />
                  <span className="absolute top-2 left-2 z-20 bg-[#111111] text-white font-mono text-[10px] px-1.5 py-0.5 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="p-3 border-t border-[#D4D4CE]">
                  <div className="text-xs font-medium text-[#111111] truncate">{product.name}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-[#666664] tabular-nums">
                    <span>{product.sku}</span>
                    <span>{formatCurrency(product.basePrice * (1 - product.discountPct / 100))}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#EBEBE6] flex items-center justify-between text-[11px] font-mono tabular-nums">
                    <span className={product.stockQty <= product.reorderPoint ? 'text-[#E53E1D] font-medium' : 'text-[#666664]'}>
                      {product.stockQty} left
                    </span>
                    <span className="text-[#111111] font-medium">
                      {forecast ? `${forecast.predictedMonth1} ML est.` : product.season}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Primary Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#D4D4CE] rounded-none p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
                Historical Sales &amp; ML Demand Trajectory
              </h2>
              <p className="text-xs text-[#666664] mt-0.5">
                Monthly aggregate units sold followed by 3-month Random Forest projections
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ml')}
              className="text-xs font-mono uppercase tracking-wider font-medium text-[#111111] underline underline-offset-4 hover:text-[#E53E1D] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>ML Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.monthlySeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#666664' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#666664' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#111111',
                    borderRadius: '0px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="actualUnits"
                  name="Actual Units Sold"
                  stroke="#111111"
                  fill="#E4E4DF"
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predictedUnits"
                  name="ML Predicted Demand"
                  stroke="#E53E1D"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={{ r: 4, fill: '#E53E1D' }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[#E0E0DC] rounded-none p-6">
          <div className="mb-5">
            <h2 className="text-base font-medium tracking-[-0.02em] text-black">
              Category Demand vs. Stock
            </h2>
            <p className="text-xs text-[#666664] mt-0.5">
              Predicted next-month demand vs. current inventory
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.categoryPerformance}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E2" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#666664' }} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={84}
                  tick={{ fontSize: 11, fill: '#0A0A0A' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#0A0A0A',
                    borderRadius: '0px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="predictedDemandUnits" name="Predicted Demand" fill="#0A0A0A" radius={[0, 0, 0, 0]} />
                <Bar dataKey="stockUnits" name="Current Stock" fill="#C4C4C0" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Actionable Recommendations & Critical Alerts Split */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-[#E0E0DC] rounded-none overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E0E0DC] flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-medium tracking-[-0.02em] text-black">
                Pricing &amp; Markdown Recommendations
              </h2>
              <p className="text-xs text-[#666664] mt-0.5">
                Elasticity-guided markdowns for slow-moving pieces and margin protection on surging styles
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className="text-xs font-medium text-black underline underline-offset-4 hover:opacity-70 whitespace-nowrap cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E0E0DC] text-xs font-medium text-[#666664] bg-[#FAFAFA]">
                  <th className="py-2.5 px-4">Garment</th>
                  <th className="py-2.5 px-4">Strategy</th>
                  <th className="py-2.5 px-4 text-right">Current</th>
                  <th className="py-2.5 px-4 text-right">Suggested</th>
                  <th className="py-2.5 px-4 text-right">Rev. Impact</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBE7] text-sm">
                {data.topRecommendations.map((rec) => (
                  <tr key={rec.productId} className="hover:bg-[#FAFAFA]">
                    <td className="py-3 px-4">
                      <div className="font-medium text-black">{rec.name}</div>
                      <div className="text-xs text-[#666664] font-mono">
                        {rec.sku} · {rec.category}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <SemanticStatus
                        label={rec.actionType}
                        tone={
                          rec.actionType === 'Markdown Clearance'
                            ? 'warning'
                            : rec.actionType === 'Margin Lift'
                              ? 'accent'
                              : 'nominal'
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#3A3A38]">
                      {formatCurrency(rec.effectivePrice)}
                      <span className="text-xs text-[#888885] ml-1">({rec.currentDiscountPct}%)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-black">
                      {formatCurrency(rec.suggestedEffectivePrice)}
                      <span className="text-xs text-[#666664] ml-1">({rec.suggestedDiscountPct}%)</span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-medium ${
                        rec.projectedRevenueDelta >= 0 ? 'text-[#166534]' : 'text-[#B45309]'
                      }`}
                    >
                      {rec.projectedRevenueDelta >= 0 ? '+' : ''}
                      {formatCurrency(rec.projectedRevenueDelta)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={applyingId === rec.productId}
                        onClick={() =>
                          handleApplyRecommendation(
                            rec.productId,
                            rec.suggestedPrice,
                            rec.suggestedDiscountPct,
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium text-white bg-black rounded-none hover:bg-[#222222] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        {applyingId === rec.productId ? 'Applying...' : 'Apply'}
                      </button>
                    </td>
                  </tr>
                ))}
                {data.topRecommendations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[#666664]">
                      All SKU prices are currently aligned with optimal ML elasticity targets.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trending & Stock Alerts Feed */}
        <div className="bg-white border border-[#E0E0DC] rounded-none overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#E0E0DC] flex items-center justify-between">
            <h2 className="text-base font-medium tracking-[-0.02em] text-black">
              Priority Stock Alerts
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-medium text-black underline underline-offset-4 hover:opacity-70 cursor-pointer"
            >
              Manage Stock
            </button>
          </div>
          <div className="divide-y divide-[#EBEBE7]">
            {data.criticalAlerts.map((alert) => (
              <div key={alert.productId} className="px-6 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-black truncate">{alert.name}</span>
                  <SemanticStatus
                    label={alert.severity}
                    tone={
                      alert.severity === 'Critical'
                        ? 'critical'
                        : alert.severity === 'Warning'
                          ? 'warning'
                          : 'neutral'
                    }
                  />
                </div>
                <div className="mt-1 text-xs text-[#666664] font-mono tabular-nums">
                  {alert.stockQty} on hand · {alert.predictedNextMonthDemand} forecast next mo
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-[#E0E0DC] bg-[#FAFAFA] mt-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-[#666664]">Fastest Trending SKUs</h3>
              <button
                type="button"
                onClick={() => onNavigate('trends')}
                className="text-xs font-medium text-black underline underline-offset-4 hover:opacity-70 cursor-pointer"
              >
                Trends
              </button>
            </div>
            <div className="space-y-2.5">
              {data.topTrending.slice(0, 3).map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-black font-medium truncate">{item.name}</span>
                  <VelocityIndicator pct={item.velocityGrowthPct} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { SemanticStatus } from '../components/StatusText';
import type { PriceRecommendation } from '../types/retail';
import { apiFetch, formatCurrency } from '../utils/api';

interface PricingOptimizationViewProps {
  refreshSignal: number;
  onDataChanged: () => void;
}

export function PricingOptimizationView({
  refreshSignal,
  onDataChanged,
}: PricingOptimizationViewProps) {
  const [recommendations, setRecommendations] = useState<PriceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>('All');
  const [editTarget, setEditTarget] = useState<PriceRecommendation | null>(null);
  const [customPrice, setCustomPrice] = useState(0);
  const [customDiscount, setCustomDiscount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ recommendations: PriceRecommendation[] }>('/api/pricing');
      setRecommendations(res.recommendations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshSignal]);

  const applyPricing = async (productId: string, basePrice: number, discountPct: number) => {
    setApplyingId(productId);
    try {
      const res = await apiFetch<{ recommendations: PriceRecommendation[] }>('/api/pricing/apply', {
        method: 'POST',
        body: JSON.stringify({ productId, basePrice, discountPct }),
      });
      setRecommendations(res.recommendations);
      onDataChanged();
    } finally {
      setApplyingId(null);
    }
  };

  const handleSaveCustom = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    await applyPricing(editTarget.productId, customPrice, customDiscount);
    setEditTarget(null);
  };

  const filtered =
    filterAction === 'All'
      ? recommendations
      : recommendations.filter((r) => r.actionType === filterAction);

  const markdownCount = recommendations.filter((r) => r.actionType === 'Markdown Clearance').length;
  const liftCount = recommendations.filter((r) => r.actionType === 'Margin Lift').length;
  const totalNetOpportunity = recommendations.reduce(
    (s, r) => s + (r.projectedRevenueDelta > 0 ? r.projectedRevenueDelta : 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-medium text-[#666664]">
            Clearance Markdown Candidates
          </div>
          <div className="mt-2.5 text-2xl font-medium text-[#B45309] font-mono tabular-nums">
            {markdownCount} SKUs
          </div>
          <div className="mt-1 text-xs text-[#666664]">Slow-moving or high stock cover items</div>
        </div>
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-medium text-[#666664]">
            Margin Lift Opportunities
          </div>
          <div className="mt-2.5 text-2xl font-medium text-[#E53E1D] font-mono tabular-nums">
            {liftCount} SKUs
          </div>
          <div className="mt-1 text-xs text-[#666664]">High demand with constrained supply</div>
        </div>
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-medium text-[#666664]">
            Projected Monthly Upside
          </div>
          <div className="mt-2.5 text-2xl font-medium text-[#166534] font-mono tabular-nums">
            +{formatCurrency(totalNetOpportunity)}
          </div>
          <div className="mt-1 text-xs text-[#666664]">Estimated revenue lift from ML pricing</div>
        </div>
      </div>

      {/* Filter Segmented Bar */}
      <div className="bg-white border border-[#D4D4CE] rounded-none overflow-hidden">
        <div className="px-6 py-4 border-b border-[#D4D4CE] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
              Dynamic Price &amp; Seasonal Discount Engine
            </h2>
            <p className="text-xs text-[#666664] mt-0.5">
              Elasticity-aware recommendations balancing sell-through velocity and gross margin
            </p>
          </div>

          <div className="flex items-center gap-5 border-b border-[#D4D4CE] overflow-x-auto">
            {['All', 'Markdown Clearance', 'Seasonal Promo', 'Margin Lift', 'Hold Optimal'].map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterAction(tab)}
                  className={`pb-2 -mb-px text-xs font-medium transition-colors cursor-pointer whitespace-nowrap border-b-2 ${
                    filterAction === tab
                      ? 'border-[#111111] text-black'
                      : 'border-transparent text-[#666664] hover:text-black'
                  }`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D4D4CE] text-xs font-medium text-[#666664] bg-[#FAFAFA]">
                <th className="py-3 px-4">Garment</th>
                <th className="py-3 px-4 text-right">Base / Disc</th>
                <th className="py-3 px-4 text-right">Margin</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4">Recommendation</th>
                <th className="py-3 px-4 text-right">Suggested</th>
                <th className="py-3 px-4 text-right">Demand Shift</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBE6] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#666664]">
                    Computing pricing elasticity...
                  </td>
                </tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.productId} className="hover:bg-[#FAFAFA]">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#111111]">{rec.name}</div>
                      <div className="text-xs font-mono text-[#666664]">
                        {rec.sku} · {rec.category}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#3A3A38]">
                      <div>{formatCurrency(rec.effectivePrice)}</div>
                      <div className="text-xs text-[#8C8980]">
                        {formatCurrency(rec.currentPrice)} ({rec.currentDiscountPct}% off)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#3A3A38]">
                      {rec.marginPct}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#111111]">
                      {rec.stockQty}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <SemanticStatus
                        label={rec.actionType}
                        tone={
                          rec.actionType === 'Markdown Clearance'
                            ? 'warning'
                            : rec.actionType === 'Margin Lift'
                              ? 'accent'
                              : rec.actionType === 'Seasonal Promo'
                                ? 'nominal'
                                : 'neutral'
                        }
                      />
                      <p className="text-xs text-[#666664] mt-1 line-clamp-2">{rec.rationale}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="font-medium text-[#111111]">
                        {formatCurrency(rec.suggestedEffectivePrice)}
                      </div>
                      <div className="text-xs text-[#E53E1D]">{rec.suggestedDiscountPct}% off</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#3A3A38]">
                      <div>
                        {rec.predictedDemandAtCurrent} →{' '}
                        <span className="font-semibold text-[#111111]">
                          {rec.predictedDemandAtSuggested}
                        </span>
                      </div>
                      <div
                        className={`text-xs ${
                          rec.projectedRevenueDelta >= 0 ? 'text-[#166534]' : 'text-[#B45309]'
                        }`}
                      >
                        {rec.projectedRevenueDelta >= 0 ? '+' : ''}
                        {formatCurrency(rec.projectedRevenueDelta)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {rec.actionType !== 'Hold Optimal' && (
                          <button
                            type="button"
                            disabled={applyingId === rec.productId}
                            onClick={() =>
                              applyPricing(
                                rec.productId,
                                rec.suggestedPrice,
                                rec.suggestedDiscountPct,
                              )
                            }
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[#111111] rounded-none hover:bg-[#222222] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                          >
                            {applyingId === rec.productId ? 'Applying...' : 'Apply'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditTarget(rec);
                            setCustomPrice(rec.currentPrice);
                            setCustomDiscount(rec.currentDiscountPct);
                          }}
                          className="p-1.5 rounded-none border border-[#D4D4CE] text-[#666664] hover:text-[#111111] hover:bg-[#EAEAE6] cursor-pointer"
                          title="Customize price & discount"
                          aria-label={`Customize pricing for ${rec.name}`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Pricing Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="w-full max-w-md bg-white border border-[#D4D4D0] rounded-none shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D4D4CE] flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
                Adjust Price · {editTarget.sku}
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-none text-[#666664] hover:text-[#111111] hover:bg-[#EAEAE6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCustom} className="p-6 space-y-4">
              <div className="text-sm font-medium text-[#111111]">{editTarget.name}</div>
              <div>
                <label className="block text-xs uppercase tracking-wide font-medium text-[#3A3A38]">
                  Base Retail Price (₹) — Cost: {formatCurrency(editTarget.costPrice)}
                </label>
                <input
                  type="number"
                  min={editTarget.costPrice}
                  step="1"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-[#3A3A38]">
                  <span className="uppercase tracking-wide">Seasonal Discount (%)</span>
                  <span className="font-mono text-[#111111]">{customDiscount}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(Number(e.target.value))}
                  className="mt-2 w-full accent-[#111111]"
                />
              </div>
              <div className="pt-3 border-t border-[#E6E6E2] flex items-center justify-between text-sm">
                <span className="text-[#666664]">Effective Price</span>
                <span className="font-mono font-semibold text-[#111111] tabular-nums">
                  {formatCurrency(customPrice * (1 - customDiscount / 100))}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-[#111111] bg-white border border-[#D4D4D0] rounded-none hover:bg-[#EAEAE6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#111111] rounded-none hover:bg-[#222222] cursor-pointer"
                >
                  Save Pricing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

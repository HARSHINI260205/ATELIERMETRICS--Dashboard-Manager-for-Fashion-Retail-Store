import { PackagePlus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { SemanticStatus } from '../components/StatusText';
import type { InventoryAlert, InventoryLog, Product } from '../types/retail';
import { apiFetch, formatNumber } from '../utils/api';

interface InventoryViewProps {
  refreshSignal: number;
  onDataChanged: () => void;
}

export function InventoryView({ refreshSignal, onDataChanged }: InventoryViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [restockTarget, setRestockTarget] = useState<{
    productId: string;
    name: string;
    sku: string;
    currentQty: number;
    recommended: number;
  } | null>(null);
  const [restockQty, setRestockQty] = useState(25);
  const [restockReason, setRestockReason] = useState('Supplier Replenishment PO');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        products: Product[];
        alerts: InventoryAlert[];
        logs: InventoryLog[];
      }>('/api/inventory');
      setProducts(res.products);
      setAlerts(res.alerts);
      setLogs(res.logs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshSignal]);

  const openRestock = (alert: InventoryAlert) => {
    const qty = Math.max(15, alert.recommendedRestockQty || 25);
    setRestockTarget({
      productId: alert.productId,
      name: alert.name,
      sku: alert.sku,
      currentQty: alert.stockQty,
      recommended: qty,
    });
    setRestockQty(qty);
    setRestockReason('ML Demand Replenishment Order');
  };

  const handleRestock = async (e: FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        alerts: InventoryAlert[];
        logs: InventoryLog[];
      }>('/api/inventory/restock', {
        method: 'POST',
        body: JSON.stringify({
          productId: restockTarget.productId,
          quantity: restockQty,
          reason: restockReason,
        }),
      });
      setAlerts(res.alerts);
      setLogs(res.logs);
      setRestockTarget(null);
      await load();
      onDataChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnits = products.reduce((s, p) => s + p.stockQty, 0);
  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'Warning').length;
  const overstockCount = alerts.filter((a) => a.severity === 'Overstock').length;

  return (
    <div className="space-y-6">
      {/* Stock KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-medium text-[#666664]">
            Total Units on Hand
          </div>
          <div className="mt-2.5 text-2xl font-medium text-[#111111] font-mono tabular-nums">
            {formatNumber(totalUnits)}
          </div>
          <div className="mt-1 text-xs text-[#666664]">Across {products.length} active SKUs</div>
        </div>
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-medium text-[#666664]">
            Critical Stockout Risk
          </div>
          <div className="mt-2.5 text-2xl font-medium text-[#B91C1C] font-mono tabular-nums">
            {criticalCount} SKUs
          </div>
          <div className="mt-1 text-xs text-[#666664]">Less than 10 days of cover</div>
        </div>
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-medium text-[#666664]">
            Reorder Threshold Alerts
          </div>
          <div className="mt-2.5 text-2xl font-medium text-[#B45309] font-mono tabular-nums">
            {warningCount} SKUs
          </div>
          <div className="mt-1 text-xs text-[#666664]">Below safety stock point</div>
        </div>
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-medium text-[#666664]">
            Overstock Watchlist
          </div>
          <div className="mt-2.5 text-2xl font-medium text-[#111111] font-mono tabular-nums">
            {overstockCount} SKUs
          </div>
          <div className="mt-1 text-xs text-[#666664]">Eligible for seasonal markdown</div>
        </div>
      </div>

      {/* Active Alerts Table */}
      <div className="bg-white border border-[#D4D4CE] rounded-none overflow-hidden">
        <div className="px-6 py-4 border-b border-[#D4D4CE]">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
            Automated Stock Alerts &amp; ML Replenishment Queue
          </h2>
          <p className="text-xs text-[#666664] mt-0.5">
            Alerts combine static reorder thresholds with next-month Random Forest demand projections
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D4D4CE] text-xs font-medium text-[#666664] bg-[#FAFAFA]">
                <th className="py-3 px-4">Garment</th>
                <th className="py-3 px-4">Alert Level</th>
                <th className="py-3 px-4 text-right">On Hand</th>
                <th className="py-3 px-4 text-right">Reorder Pt</th>
                <th className="py-3 px-4 text-right">ML Forecast</th>
                <th className="py-3 px-4 text-right">Days Cover</th>
                <th className="py-3 px-4">Diagnostic Note</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBE6] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#666664]">
                    Evaluating inventory thresholds...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#666664]">
                    All products are within optimal stock bounds.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.productId} className="hover:bg-[#FAFAFA]">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#111111]">{a.name}</div>
                      <div className="text-xs font-mono text-[#666664]">
                        {a.sku} · {a.category}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <SemanticStatus
                        label={a.severity}
                        tone={
                          a.severity === 'Critical'
                            ? 'critical'
                            : a.severity === 'Warning'
                              ? 'warning'
                              : 'neutral'
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#111111]">
                      {a.stockQty}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#666664]">
                      {a.reorderPoint}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#E53E1D] font-medium">
                      {a.predictedNextMonthDemand}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#3A3A38]">
                      {a.daysOfCover}d
                    </td>
                    <td className="py-3 px-4 text-xs text-[#666664] max-w-xs">{a.message}</td>
                    <td className="py-3 px-4 text-right">
                      {a.severity !== 'Overstock' ? (
                        <button
                          type="button"
                          onClick={() => openRestock(a)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#111111] rounded-none hover:bg-[#222222] cursor-pointer whitespace-nowrap"
                        >
                          <PackagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Restock +{a.recommendedRestockQty}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-[#666664]">Markdown candidate</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Movement Log */}
      <div className="bg-white border border-[#D4D4CE] rounded-none overflow-hidden">
        <div className="px-6 py-4 border-b border-[#D4D4CE]">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">Recent Stock Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D4D4CE] text-xs font-medium text-[#666664] bg-[#FAFAFA]">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">SKU &amp; Product</th>
                <th className="py-2.5 px-4 text-right">Change</th>
                <th className="py-2.5 px-4 text-right">New Balance</th>
                <th className="py-2.5 px-4">Reason</th>
                <th className="py-2.5 px-4">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBE6] text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-2.5 px-4 font-mono text-xs text-[#666664] tabular-nums whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-medium text-[#111111]">{log.productName}</span>
                    <span className="ml-2 text-xs font-mono text-[#666664]">{log.sku}</span>
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono tabular-nums font-medium ${
                      log.delta >= 0 ? 'text-[#166534]' : 'text-[#3A3A38]'
                    }`}
                  >
                    {log.delta >= 0 ? `+${log.delta}` : log.delta}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#111111]">
                    {log.newQty}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[#666664]">{log.reason}</td>
                  <td className="py-2.5 px-4 text-xs text-[#666664]">{log.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="w-full max-w-md bg-white border border-[#D4D4D0] rounded-none shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D4D4CE] flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
                Replenish Stock · {restockTarget.sku}
              </h3>
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="p-1.5 rounded-none text-[#666664] hover:text-[#111111] hover:bg-[#EAEAE6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRestock} className="p-6 space-y-4">
              <div className="text-sm text-[#3A3A38]">
                <span className="font-medium text-[#111111]">{restockTarget.name}</span> currently has{' '}
                <span className="font-mono font-semibold">{restockTarget.currentQty}</span> units on hand.
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide font-medium text-[#3A3A38]">
                  Units to Add (ML Recommended: {restockTarget.recommended})
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide font-medium text-[#3A3A38]">
                  Purchase Order / Note
                </label>
                <input
                  required
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRestockTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-[#111111] bg-white border border-[#D4D4D0] rounded-none hover:bg-[#EAEAE6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#111111] rounded-none hover:bg-[#222222] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Updating...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

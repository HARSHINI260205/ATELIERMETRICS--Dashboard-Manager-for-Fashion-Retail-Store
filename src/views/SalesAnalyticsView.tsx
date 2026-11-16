import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SaleTransaction } from '../types/retail';
import { apiFetch, downloadCsv, formatCurrency, formatNumber } from '../utils/api';

interface SalesResponse {
  transactions: SaleTransaction[];
  monthlySeries: Array<{ yearMonth: string; units: number; revenue: number }>;
  dailySeries: Array<{ date: string; units: number; revenue: number }>;
  productPerformance: Array<{
    productId: string;
    sku: string;
    name: string;
    category: string;
    totalUnits: number;
    totalRevenue: number;
    grossProfit: number;
    stockQty: number;
  }>;
}

export function SalesAnalyticsView({ refreshSignal }: { refreshSignal: number }) {
  const [data, setData] = useState<SalesResponse | null>(null);
  const [granularity, setGranularity] = useState<'monthly' | 'daily'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<SalesResponse>('/api/sales')
      .then(setData)
      .finally(() => setLoading(false));
  }, [refreshSignal]);

  if (loading && !data) {
    return <div className="h-96 bg-white border border-[#D4D4CE] rounded-none animate-pulse" />;
  }
  if (!data) return null;

  const bestSellers = data.productPerformance.slice(0, 5);
  const slowMovers = [...data.productPerformance].reverse().slice(0, 5);
  const series =
    granularity === 'monthly'
      ? data.monthlySeries.map((m) => ({ label: m.yearMonth, units: m.units, revenue: m.revenue }))
      : data.dailySeries.map((d) => ({ label: d.date, units: d.units, revenue: d.revenue }));

  const handleExportSales = () => {
    downloadCsv(
      'ateliermetrics-sales-report.csv',
      ['SKU', 'Product', 'Category', 'Total Units', 'Revenue (₹)', 'Gross Profit (₹)', 'Stock Left'],
      data.productPerformance.map((p) => [
        p.sku,
        p.name,
        p.category,
        p.totalUnits,
        p.totalRevenue,
        p.grossProfit,
        p.stockQty,
      ]),
    );
  };

  return (
    <div className="space-y-6">
      {/* Sales Trend Chart */}
      <div className="bg-white border border-[#D4D4CE] rounded-none p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
              {granularity === 'monthly' ? 'Monthly Revenue Trajectory' : 'Daily POS Revenue (Current Month)'}
            </h2>
            <p className="text-xs text-[#666664] mt-0.5">
              Switch between 14-month longitudinal performance and daily showroom velocity
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-5 border-b border-[#D4D4CE]">
              <button
                type="button"
                onClick={() => setGranularity('monthly')}
                className={`pb-2 -mb-px text-xs font-medium transition-colors cursor-pointer whitespace-nowrap border-b-2 ${
                  granularity === 'monthly'
                    ? 'border-[#111111] text-black'
                    : 'border-transparent text-[#666664] hover:text-black'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setGranularity('daily')}
                className={`pb-2 -mb-px text-xs font-medium transition-colors cursor-pointer whitespace-nowrap border-b-2 ${
                  granularity === 'daily'
                    ? 'border-[#111111] text-black'
                    : 'border-transparent text-[#666664] hover:text-black'
                }`}
              >
                Daily
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportSales}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111111] bg-white border border-[#D4D4D0] rounded-none hover:bg-[#EAEAE6] cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export Sales CSV</span>
            </button>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E2" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#666664' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#666664' }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#D4D4CE',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue (₹)"
                stroke="#111111"
                fill="#E6E6E2"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best vs Slow-Moving SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#D4D4CE] rounded-none p-6">
          <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111] mb-4">
            Top-Selling Fashion SKUs
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bestSellers}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E2" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#666664' }} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="sku"
                  width={92}
                  tick={{ fontSize: 11, fill: '#3A3834' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="totalRevenue" name="Revenue (₹)" fill="#111111" radius={[0, 1, 1, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 divide-y divide-[#EBEBE6] text-xs">
            {bestSellers.map((p) => (
              <div key={p.productId} className="py-2 flex items-center justify-between gap-4">
                <span className="font-medium text-[#111111] truncate">{p.name}</span>
                <span className="font-mono tabular-nums text-[#666664] shrink-0">
                  {formatNumber(p.totalUnits)} units · {formatCurrency(p.totalRevenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#D4D4CE] rounded-none p-6">
          <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111] mb-4">
            Low-Velocity / Slow-Moving SKUs
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={slowMovers}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E2" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#666664' }} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="sku"
                  width={92}
                  tick={{ fontSize: 11, fill: '#3A3834' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="totalUnits" name="Units Sold" fill="#B45309" radius={[0, 1, 1, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 divide-y divide-[#EBEBE6] text-xs">
            {slowMovers.map((p) => (
              <div key={p.productId} className="py-2 flex items-center justify-between gap-4">
                <span className="font-medium text-[#111111] truncate">{p.name}</span>
                <span className="font-mono tabular-nums text-[#666664] shrink-0">
                  {formatNumber(p.totalUnits)} units · {p.stockQty} left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white border border-[#D4D4CE] rounded-none overflow-hidden">
        <div className="px-6 py-4 border-b border-[#D4D4CE]">
          <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">Recent POS Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D4D4CE] text-xs font-medium text-[#666664] bg-[#FAFAFA]">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">SKU &amp; Product</th>
                <th className="py-2.5 px-4">Channel</th>
                <th className="py-2.5 px-4 text-right">Qty</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
                <th className="py-2.5 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBE6] text-sm">
              {data.transactions.slice(0, 15).map((tx) => (
                <tr key={tx.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-2.5 px-4 font-mono text-xs text-[#666664] tabular-nums whitespace-nowrap">
                    {new Date(tx.soldAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-[#111111]">{tx.productName}</div>
                    <div className="text-xs font-mono text-[#666664]">{tx.sku}</div>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[#666664]">{tx.channel}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#111111]">
                    {tx.quantity}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#666664]">
                    {formatCurrency(tx.unitPrice)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-[#111111]">
                    {formatCurrency(tx.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

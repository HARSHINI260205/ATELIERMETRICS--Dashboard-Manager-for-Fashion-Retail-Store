import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SemanticStatus, VelocityIndicator } from '../components/StatusText';
import type { SeasonalPatternRow, TrendAnalysisItem } from '../types/retail';
import { apiFetch, formatCurrency, formatNumber } from '../utils/api';

interface TrendsResponse {
  items: TrendAnalysisItem[];
  seasonalMatrix: SeasonalPatternRow[];
  colorBreakdown: Array<{ color: string; colorHex: string; units: number }>;
}

export function TrendsView({ refreshSignal }: { refreshSignal: number }) {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<TrendsResponse>('/api/trends')
      .then(setData)
      .finally(() => setLoading(false));
  }, [refreshSignal]);

  if (loading && !data) {
    return <div className="h-96 bg-white border border-[#D4D4CE] rounded-none animate-pulse" />;
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Seasonal Sales Patterns Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#D4D4CE] rounded-none p-6">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
              Seasonal Category Demand Patterns
            </h2>
            <p className="text-xs text-[#666664] mt-0.5">
              Aggregate units sold across Spring, Summer, Autumn, and Winter fashion cycles
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.seasonalMatrix} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E2" vertical={false} />
                <XAxis dataKey="season" tick={{ fontSize: 12, fill: '#3A3834' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#666664' }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Outerwear" fill="#111111" radius={[1, 1, 0, 0]} />
                <Bar dataKey="Knitwear" fill="#E53E1D" radius={[1, 1, 0, 0]} />
                <Bar dataKey="Denim" fill="#57554F" radius={[1, 1, 0, 0]} />
                <Bar dataKey="Dresses" fill="#166534" radius={[1, 1, 0, 0]} />
                <Bar dataKey="Footwear" fill="#B45309" radius={[1, 1, 0, 0]} />
                <Bar dataKey="Accessories" fill="#A1A1AA" radius={[1, 1, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Colorway Demand Popularity */}
        <div className="bg-white border border-[#D4D4CE] rounded-none p-6">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
            Trending Colorways (90D)
          </h2>
          <p className="text-xs text-[#666664] mt-0.5 mb-4">
            Recent quarterly unit demand grouped by textile finish
          </p>
          <div className="divide-y divide-[#EBEBE6]">
            {data.colorBreakdown.slice(0, 7).map((c) => {
              const maxUnits = data.colorBreakdown[0]?.units || 1;
              const pct = Math.round((c.units / maxUnits) * 100);
              return (
                <div key={c.color} className="py-2.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-2 font-medium text-[#111111]">
                      <span
                        className="w-3 h-3 rounded-full border border-[#D4D4D0] shrink-0"
                        style={{ backgroundColor: c.colorHex }}
                        aria-hidden="true"
                      />
                      <span>{c.color}</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#666664]">{c.units} units</span>
                  </div>
                  <div className="w-full h-1 bg-[#EAEAE6] overflow-hidden">
                    <div
                      className="h-full bg-[#111111]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Velocity & Demand Tier Categorization */}
      <div className="bg-white border border-[#D4D4CE] rounded-none overflow-hidden">
        <div className="px-6 py-4 border-b border-[#D4D4CE]">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
            Product Demand Classification &amp; Quarterly Velocity
          </h2>
          <p className="text-xs text-[#666664] mt-0.5">
            Comparing trailing 3-month sell-through against the prior 3-month window
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D4D4CE] text-xs font-medium text-[#666664] bg-[#FAFAFA]">
                <th className="py-3 px-4">Garment</th>
                <th className="py-3 px-4">Season Affinity</th>
                <th className="py-3 px-4">Colorway</th>
                <th className="py-3 px-4 text-right">Prior 3M</th>
                <th className="py-3 px-4 text-right">Recent 3M</th>
                <th className="py-3 px-4 text-right">Velocity Shift</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4">ML Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBE6] text-sm">
              {data.items.map((item) => (
                <tr key={item.productId} className="hover:bg-[#FAFAFA]">
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#111111]">{item.name}</div>
                    <div className="text-xs font-mono text-[#666664]">
                      {item.sku} · {item.category}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#3A3A38]">{item.season}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-2 text-xs text-[#3A3A38]">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-[#D4D4D0]"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      <span>{item.color}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#666664]">
                    {formatNumber(item.priorUnits)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#111111]">
                    {formatNumber(item.recentUnits)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <VelocityIndicator pct={item.velocityGrowthPct} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#111111]">
                    {formatCurrency(item.revenueContribution)}
                  </td>
                  <td className="py-3 px-4">
                    <SemanticStatus
                      label={item.demandTier}
                      tone={
                        item.demandTier === 'Surging'
                          ? 'accent'
                          : item.demandTier === 'High Demand'
                            ? 'nominal'
                            : item.demandTier === 'Slow-Moving'
                              ? 'warning'
                              : 'neutral'
                      }
                    />
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

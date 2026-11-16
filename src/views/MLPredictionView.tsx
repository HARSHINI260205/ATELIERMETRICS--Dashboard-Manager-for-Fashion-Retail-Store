import { Cpu, Play, RefreshCw } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SemanticStatus, VelocityIndicator } from '../components/StatusText';
import type { MLModelMetrics, Product, ProductForecast } from '../types/retail';
import { apiFetch, formatCurrency } from '../utils/api';

const MONTH_OPTIONS = [
  { value: 1, label: 'January (Winter)' },
  { value: 2, label: 'February (Winter)' },
  { value: 3, label: 'March (Spring)' },
  { value: 4, label: 'April (Spring)' },
  { value: 5, label: 'May (Spring)' },
  { value: 6, label: 'June (Summer)' },
  { value: 7, label: 'July (Summer)' },
  { value: 8, label: 'August (Summer)' },
  { value: 9, label: 'September (Autumn)' },
  { value: 10, label: 'October (Autumn)' },
  { value: 11, label: 'November (Autumn)' },
  { value: 12, label: 'December (Winter)' },
];

export function MLPredictionView({ refreshSignal }: { refreshSignal: number }) {
  const [metrics, setMetrics] = useState<MLModelMetrics | null>(null);
  const [forecasts, setForecasts] = useState<ProductForecast[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [nEstimators, setNEstimators] = useState(40);
  const [maxDepth, setMaxDepth] = useState(8);
  const [training, setTraining] = useState(false);

  // What-If Simulator State
  const [simProductId, setSimProductId] = useState('');
  const [simMonth, setSimMonth] = useState(12);
  const [simPrice, setSimPrice] = useState(16500);
  const [simDiscount, setSimDiscount] = useState(10);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    predictedUnits: number;
    projectedRevenue: number;
    projectedGrossProfit: number;
    baselineUnits: number;
    demandLiftPct: number;
    confidenceScore: number;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [mlRes, prodRes] = await Promise.all([
        apiFetch<{ metrics: MLModelMetrics; forecasts: ProductForecast[] }>('/api/ml/predictions'),
        apiFetch<{ products: Product[] }>('/api/products'),
      ]);
      setMetrics(mlRes.metrics);
      setForecasts(mlRes.forecasts);
      setProducts(prodRes.products);
      setNEstimators(mlRes.metrics.nEstimators);
      setMaxDepth(mlRes.metrics.maxDepth);

      if (!simProductId && prodRes.products.length > 0) {
        const first = prodRes.products[0];
        setSimProductId(first.id);
        setSimPrice(first.basePrice);
        setSimDiscount(first.discountPct);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshSignal]);

  const handleSelectSimProduct = (id: string) => {
    setSimProductId(id);
    const p = products.find((item) => item.id === id);
    if (p) {
      setSimPrice(p.basePrice);
      setSimDiscount(p.discountPct);
    }
    setSimResult(null);
  };

  const handleRetrain = async () => {
    setTraining(true);
    try {
      const res = await apiFetch<{ metrics: MLModelMetrics; forecasts: ProductForecast[] }>(
        '/api/ml/train',
        {
          method: 'POST',
          body: JSON.stringify({ nEstimators, maxDepth }),
        },
      );
      setMetrics(res.metrics);
      setForecasts(res.forecasts);
    } finally {
      setTraining(false);
    }
  };

  const handleSimulate = async (e: FormEvent) => {
    e.preventDefault();
    if (!simProductId) return;
    setSimulating(true);
    try {
      const res = await apiFetch<{
        simulation: {
          predictedUnits: number;
          projectedRevenue: number;
          projectedGrossProfit: number;
          baselineUnits: number;
          demandLiftPct: number;
          confidenceScore: number;
        };
      }>('/api/ml/simulate', {
        method: 'POST',
        body: JSON.stringify({
          productId: simProductId,
          targetMonth: simMonth,
          proposedPrice: simPrice,
          proposedDiscountPct: simDiscount,
        }),
      });
      setSimResult(res.simulation);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !metrics) {
    return <div className="h-96 bg-white border border-[#E0E0DC] rounded-none animate-pulse" />;
  }
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Model Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-[#111111] rounded-none p-5 text-white">
          <div className="text-xs font-mono uppercase tracking-wider text-white/70">
            Validation R² Score
          </div>
          <div className="mt-2.5 font-display text-4xl font-semibold tracking-tight text-[#FF6B4A] tabular-nums">
            {metrics.r2Score.toFixed(3)}
          </div>
          <div className="mt-2 pt-2 border-t border-white/15 text-xs text-white/75">
            Random Forest variance explained
          </div>
        </div>
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-mono uppercase tracking-wider text-[#666664]">
            Mean Absolute Error
          </div>
          <div className="mt-2.5 font-display text-4xl font-semibold tracking-tight text-[#111111] tabular-nums">
            ±{metrics.mae} <span className="text-lg font-normal text-[#666664]">UNITS</span>
          </div>
          <div className="mt-1 text-xs text-[#666664]">RMSE: {metrics.rmse} units</div>
        </div>
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5">
          <div className="text-xs font-mono uppercase tracking-wider text-[#666664]">
            Ensemble Parameters
          </div>
          <div className="mt-2.5 font-display text-4xl font-semibold tracking-tight text-[#111111] tabular-nums">
            {metrics.nEstimators} <span className="text-lg font-normal text-[#666664]">TREES</span>
          </div>
          <div className="mt-1 text-xs text-[#666664] font-mono">
            Max depth {metrics.maxDepth} · {metrics.trainingSamples + metrics.validationSamples} samples
          </div>
        </div>
        <div className="bg-white border border-[#D4D4CE] rounded-none p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#666664]">
              Hyperparameters
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-[#3A3A38]">
                Trees
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={nEstimators}
                  onChange={(e) => setNEstimators(Number(e.target.value))}
                  className="ml-1.5 w-16 px-2 py-1 text-xs font-mono bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
                />
              </label>
              <label className="text-xs text-[#3A3A38]">
                Depth
                <input
                  type="number"
                  min={3}
                  max={14}
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  className="ml-1.5 w-14 px-2 py-1 text-xs font-mono bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
                />
              </label>
            </div>
          </div>
          <button
            type="button"
            disabled={training}
            onClick={handleRetrain}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono uppercase tracking-wider font-medium text-white bg-[#111111] rounded-none hover:bg-[#E53E1D] disabled:opacity-60 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${training ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{training ? 'Training Forest...' : 'Retrain Random Forest'}</span>
          </button>
        </div>
      </div>

      {/* Feature Importance + What-If Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#D4D4CE] rounded-none p-6">
          <div className="mb-4">
            <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
              Random Forest Feature Importance
            </h2>
            <p className="text-xs text-[#666664] mt-0.5">
              Relative predictive weight across CART bootstrap decision splits
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.featureImportances}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 24, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E2" horizontal={false} />
                <XAxis
                  type="number"
                  unit="%"
                  tick={{ fontSize: 11, fill: '#666664' }}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="feature"
                  width={132}
                  tick={{ fontSize: 11, fill: '#3A3A38' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="importance" name="Importance (%)" fill="#E53E1D" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interactive What-If Inference Workbench */}
        <div className="bg-white border border-[#D4D4CE] rounded-none p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#E53E1D]" aria-hidden="true" />
              <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">
                What-If Demand &amp; Elasticity Simulator
              </h2>
            </div>
            <p className="text-xs text-[#666664] mt-0.5">
              Run real-time Random Forest inference for any SKU, future month, price, and discount
            </p>

            <form onSubmit={handleSimulate} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3A3A38]">Target SKU</label>
                  <select
                    value={simProductId}
                    onChange={(e) => handleSelectSimProduct(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3A3A38]">Target Month</label>
                  <select
                    value={simMonth}
                    onChange={(e) => setSimMonth(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 text-sm bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3A3A38]">
                    Proposed Base Price (₹)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step="1"
                    value={simPrice}
                    onChange={(e) => setSimPrice(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3A3A38]">
                    Seasonal Discount ({simDiscount}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={simDiscount}
                    onChange={(e) => setSimDiscount(Number(e.target.value))}
                    className="mt-3 w-full accent-[#E53E1D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={simulating}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider font-medium text-white bg-[#111111] rounded-none hover:bg-[#E53E1D] disabled:opacity-60 cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{simulating ? 'Running Inference...' : 'Run Demand Prediction'}</span>
              </button>
            </form>
          </div>

          {simResult && (
            <div className="mt-5 pt-4 border-t border-[#E6E6E2] grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-[#666664]">Predicted Demand</div>
                <div className="mt-1 text-lg font-medium text-[#0A0A0A] font-mono tabular-nums">
                  {simResult.predictedUnits} units
                </div>
                <div className="text-xs text-[#666664] font-mono">
                  {simResult.demandLiftPct >= 0 ? '+' : ''}
                  {simResult.demandLiftPct}% vs baseline
                </div>
              </div>
              <div>
                <div className="text-xs text-[#666664]">Projected Revenue</div>
                <div className="mt-1 text-lg font-medium text-[#0A0A0A] font-mono tabular-nums">
                  {formatCurrency(simResult.projectedRevenue)}
                </div>
                <div className="text-xs text-[#166534] font-mono">
                  Gross Profit {formatCurrency(simResult.projectedGrossProfit)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#666664]">Tree Consensus</div>
                <div className="mt-1 text-lg font-medium text-[#18181B] font-mono tabular-nums">
                  {simResult.confidenceScore}%
                </div>
                <div className="text-xs text-[#666664]">{metrics.nEstimators}-tree agreement</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3-Month Forecast & Stock Recommendation Table */}
      <div className="bg-white border border-[#E0E0DC] rounded-none overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E0E0DC]">
          <h2 className="text-base font-medium tracking-[-0.02em] text-[#0A0A0A]">
            90-Day SKU Demand Forecast &amp; Stock Recommendations
          </h2>
          <p className="text-xs text-[#666664] mt-0.5">
            Autoregressive 3-month unit projections with safety stock order quantities
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E0E0DC] text-xs font-medium text-[#666664] bg-[#FAFAFA]">
                <th className="py-3 px-4">Garment</th>
                <th className="py-3 px-4">Demand Tier</th>
                <th className="py-3 px-4 text-right">On Hand</th>
                <th className="py-3 px-4 text-right">Dec Forecast</th>
                <th className="py-3 px-4 text-right">Jan Forecast</th>
                <th className="py-3 px-4 text-right">Feb Forecast</th>
                <th className="py-3 px-4 text-right">vs 3M Avg</th>
                <th className="py-3 px-4 text-right">Rec. Order</th>
                <th className="py-3 px-4">Stock Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBE7] text-sm">
              {forecasts.map((fc) => (
                <tr key={fc.productId} className="hover:bg-[#FAFAFA]">
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#0A0A0A]">{fc.name}</div>
                    <div className="text-xs font-mono text-[#666664]">
                      {fc.sku} · {fc.category} · {fc.season}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <SemanticStatus
                      label={fc.demandTier}
                      tone={
                        fc.demandTier === 'Surging'
                          ? 'accent'
                          : fc.demandTier === 'High Demand'
                            ? 'nominal'
                            : fc.demandTier === 'Slow-Moving'
                              ? 'warning'
                              : 'neutral'
                      }
                    />
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#3A3A38]">
                    {fc.currentStock}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18181B]">
                    {fc.predictedMonth1}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#0A0A0A]">
                    {fc.predictedMonth2}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#0A0A0A]">
                    {fc.predictedMonth3}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <VelocityIndicator pct={fc.demandChangePct} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#0A0A0A]">
                    {fc.recommendedOrderQty > 0 ? `+${fc.recommendedOrderQty}` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <SemanticStatus
                      label={fc.stockStatus}
                      tone={
                        fc.stockStatus === 'Critical Low'
                          ? 'critical'
                          : fc.stockStatus === 'Low Stock'
                            ? 'warning'
                            : fc.stockStatus === 'Optimal'
                              ? 'nominal'
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

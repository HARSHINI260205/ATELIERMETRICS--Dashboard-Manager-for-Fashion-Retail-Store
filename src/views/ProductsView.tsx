import { Edit2, LayoutGrid, List, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ProductThumb, SemanticStatus } from '../components/StatusText';
import type { FashionCategory, FashionSeason, Product } from '../types/retail';
import { apiFetch, formatCurrency } from '../utils/api';

interface ProductsViewProps {
  refreshSignal: number;
  onDataChanged: () => void;
}

const CATEGORIES: FashionCategory[] = [
  'Outerwear',
  'Knitwear',
  'Dresses',
  'Denim',
  'Footwear',
  'Accessories',
];
const SEASONS: FashionSeason[] = ['Spring', 'Summer', 'Autumn', 'Winter', 'All-Season'];

export function ProductsView({ refreshSignal, onDataChanged }: ProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [seasonFilter, setSeasonFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'lookbook'>('lookbook');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [formState, setFormState] = useState({
    sku: '',
    name: '',
    category: 'Outerwear' as FashionCategory,
    size: 'M',
    color: 'Obsidian Black',
    colorHex: '#1E293B',
    costPrice: 5000,
    basePrice: 15000,
    discountPct: 0,
    stockQty: 30,
    reorderPoint: 20,
    season: 'All-Season' as FashionSeason,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProducts = async (qVal = search, catVal = categoryFilter, seaVal = seasonFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (qVal.trim()) params.set('q', qVal.trim());
      if (catVal !== 'All') params.set('category', catVal);
      if (seaVal !== 'All') params.set('season', seaVal);
      const qs = params.toString();
      const res = await apiFetch<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ''}`);
      setProducts(res.products);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(search, categoryFilter, seasonFilter);
    }, 150);
    return () => clearTimeout(timer);
  }, [refreshSignal, search, categoryFilter, seasonFilter]);

  const filtered = useMemo(() => products, [products]);

  const openAddModal = () => {
    setEditing(null);
    setFormError(null);
    setFormState({
      sku: `ATL-NW-${Math.floor(100 + Math.random() * 899)}`,
      name: '',
      category: 'Outerwear',
      size: 'M',
      color: 'Slate Charcoal',
      colorHex: '#334155',
      costPrice: 5500,
      basePrice: 16500,
      discountPct: 0,
      stockQty: 35,
      reorderPoint: 20,
      season: 'Autumn',
    });
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditing(product);
    setFormError(null);
    setFormState({
      sku: product.sku,
      name: product.name,
      category: product.category,
      size: product.size,
      color: product.color,
      colorHex: product.colorHex,
      costPrice: product.costPrice,
      basePrice: product.basePrice,
      discountPct: product.discountPct,
      stockQty: product.stockQty,
      reorderPoint: product.reorderPoint,
      season: product.season,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/products/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(formState),
        });
      } else {
        await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(formState),
        });
      }
      setModalOpen(false);
      await loadProducts();
      onDataChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await apiFetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    await loadProducts();
    onDataChanged();
  };

  return (
    <div className="space-y-6">
      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-[#D4D4CE] rounded-none p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#888885] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, garment name, or color..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none text-black focus:outline-none focus:border-[#111111]"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none text-black focus:outline-none focus:border-[#111111]"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by season"
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none text-black focus:outline-none focus:border-[#111111]"
          >
            <option value="All">All Seasons</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center border border-[#D4D4D0] bg-white">
            <button
              type="button"
              onClick={() => setViewMode('lookbook')}
              aria-label="Contact sheet view"
              className={`px-2.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'lookbook' ? 'bg-[#111111] text-white' : 'text-[#666664] hover:text-black'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Line Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Ledger table view"
              className={`px-2.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer border-l border-[#D4D4D0] ${
                viewMode === 'table' ? 'bg-[#111111] text-white' : 'text-[#666664] hover:text-black'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ledger</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#111111] rounded-none hover:bg-[#E53E1D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-80 bg-white border border-[#D4D4CE] animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#D4D4CE] p-12 text-center text-sm text-[#666664]">
          No matching products found. Adjust filters or add a new SKU.
        </div>
      ) : viewMode === 'lookbook' ? (
        /* 1990s Showroom Line-Sheet Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p, idx) => {
            const effective = p.basePrice * (1 - p.discountPct / 100);
            const isCritical = p.stockQty <= Math.max(5, Math.floor(p.reorderPoint * 0.5));
            const isLow = p.stockQty <= p.reorderPoint;
            return (
              <div
                key={p.id}
                className="bg-white border border-[#D4D4CE] hover:border-[#111111] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="relative bg-[#F2F2EE] overflow-hidden">
                    <ProductThumb
                      name={p.name}
                      colorHex={p.colorHex}
                      category={p.category}
                      sku={p.sku}
                      size="lg"
                    />
                    <span className="absolute top-2.5 left-2.5 z-20 bg-[#111111] text-white font-mono text-[10px] px-1.5 py-0.5 tabular-nums">
                      NO. {String(idx + 1).padStart(2, '0')}
                    </span>
                    {p.discountPct > 0 && (
                      <span className="absolute top-2.5 right-2.5 bg-white border border-[#111111] text-black font-mono text-[10px] px-1.5 py-0.5 tabular-nums">
                        -{p.discountPct}%
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#666664]">
                      <span>{p.sku}</span>
                      <span>
                        {p.category} · {p.season}
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-display text-2xl font-semibold uppercase tracking-tight text-black">
                      {p.name}
                    </h3>

                    <div className="mt-3 pt-3 border-t border-[#EBEBE6] flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2 text-[#3A3A38]">
                        <span
                          className="w-3 h-3 rounded-full border border-[#D4D4D0]"
                          style={{ backgroundColor: p.colorHex }}
                          aria-hidden="true"
                        />
                        <span>
                          {p.color} · {p.size}
                        </span>
                      </span>
                      <span className="font-mono text-sm font-medium text-black tabular-nums">
                        {formatCurrency(effective)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-[#D4D4CE] bg-[#FAFAFA] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isCritical ? (
                      <SemanticStatus label={`${p.stockQty} · Critical`} tone="critical" />
                    ) : isLow ? (
                      <SemanticStatus label={`${p.stockQty} · Low`} tone="warning" />
                    ) : (
                      <SemanticStatus label={`${p.stockQty} in stock`} tone="nominal" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-1.5 text-[#666664] hover:text-black hover:bg-[#EAEAE6] cursor-pointer"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      className="p-1.5 text-[#666664] hover:text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Ledger Table View */
        <div className="bg-white border border-[#D4D4CE] rounded-none overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D4D4CE] flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-black">
              Collection SKU Ledger ({filtered.length})
            </h2>
            <span className="text-xs text-[#666664]">
              Sizes, colorways, unit margins, and active stock levels
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D4D4CE] text-xs font-medium text-[#666664] bg-[#FAFAFA]">
                  <th className="py-3 px-4">Garment</th>
                  <th className="py-3 px-4">Category &amp; Season</th>
                  <th className="py-3 px-4">Color / Size</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  <th className="py-3 px-4 text-right">Retail Price</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBE6] text-sm">
                {filtered.map((p) => {
                  const effective = p.basePrice * (1 - p.discountPct / 100);
                  const isCritical = p.stockQty <= Math.max(5, Math.floor(p.reorderPoint * 0.5));
                  const isLow = p.stockQty <= p.reorderPoint;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAFAFA]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <ProductThumb
                            name={p.name}
                            colorHex={p.colorHex}
                            category={p.category}
                            sku={p.sku}
                            size="md"
                          />
                          <div>
                            <div className="font-medium text-black">{p.name}</div>
                            <div className="text-xs font-mono text-[#666664]">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#3A3A38]">
                        <div>{p.category}</div>
                        <div className="text-xs text-[#666664]">{p.season}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-[#3A3A38]">
                          <span
                            className="w-3 h-3 rounded-full border border-[#D4D4D0] shrink-0"
                            style={{ backgroundColor: p.colorHex }}
                            aria-hidden="true"
                          />
                          <span>{p.color}</span>
                          <span className="text-[#A1A1AA]">·</span>
                          <span className="font-mono text-xs text-[#666664]">{p.size}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#666664]">
                        {formatCurrency(p.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-black">
                        {formatCurrency(effective)}
                        {p.discountPct > 0 && (
                          <div className="text-xs text-[#888885] line-through">
                            {formatCurrency(p.basePrice)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#3A3A38]">
                        {p.discountPct}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-black">
                        {p.stockQty}
                      </td>
                      <td className="py-3 px-4">
                        {isCritical ? (
                          <SemanticStatus label="Critical Low" tone="critical" />
                        ) : isLow ? (
                          <SemanticStatus label="Low Stock" tone="warning" />
                        ) : (
                          <SemanticStatus label="In Stock" tone="nominal" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-none text-[#666664] hover:text-black hover:bg-[#EAEAE6] cursor-pointer"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="p-2 rounded-none text-[#666664] hover:text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xl bg-white border border-[#D4D4D0] rounded-none shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#D4D4CE] flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-black">
                {editing ? `Edit SKU · ${editing.sku}` : 'Add New Fashion Product'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-none text-[#666664] hover:text-black hover:bg-[#EAEAE6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black">SKU Code</label>
                  <input
                    required
                    value={formState.sku}
                    onChange={(e) => setFormState({ ...formState, sku: e.target.value })}
                    className="mt-1 w-full px-3 py-2 text-sm font-mono bg-white border border-[#D4D4D0] rounded-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-black">Product Name</label>
                  <input
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="e.g., 3L Gore-Tex Technical Jacket"
                    className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black">Category</label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({ ...formState, category: e.target.value as FashionCategory })
                    }
                    className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-black">Season</label>
                  <select
                    value={formState.season}
                    onChange={(e) =>
                      setFormState({ ...formState, season: e.target.value as FashionSeason })
                    }
                    className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none"
                  >
                    {SEASONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-black">Size</label>
                  <input
                    required
                    value={formState.size}
                    onChange={(e) => setFormState({ ...formState, size: e.target.value })}
                    className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black">Color</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={formState.colorHex}
                      onChange={(e) => setFormState({ ...formState, colorHex: e.target.value })}
                      className="w-9 h-9 p-0.5 border border-[#D4D4D0] rounded-none cursor-pointer shrink-0"
                    />
                    <input
                      required
                      value={formState.color}
                      onChange={(e) => setFormState({ ...formState, color: e.target.value })}
                      className="w-full px-2.5 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black">Cost (₹)</label>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    required
                    value={formState.costPrice}
                    onChange={(e) => setFormState({ ...formState, costPrice: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D4D4D0] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black">Base Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    required
                    value={formState.basePrice}
                    onChange={(e) => setFormState({ ...formState, basePrice: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D4D4D0] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black">Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={75}
                    value={formState.discountPct}
                    onChange={(e) =>
                      setFormState({ ...formState, discountPct: Number(e.target.value) })
                    }
                    className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D4D4D0] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black">Stock Qty</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formState.stockQty}
                    onChange={(e) => setFormState({ ...formState, stockQty: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D4D4D0] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black">Reorder Pt</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formState.reorderPoint}
                    onChange={(e) =>
                      setFormState({ ...formState, reorderPoint: Number(e.target.value) })
                    }
                    className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D4D4D0] rounded-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-none bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                  {formError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-black bg-white border border-[#D4D4D0] rounded-none hover:bg-[#EAEAE6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#111111] rounded-none hover:bg-[#E53E1D] disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="w-full max-w-md bg-white border border-[#D4D4D0] rounded-none shadow-xl p-6">
            <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-black">Delete Product SKU</h3>
            <p className="mt-2 text-sm text-[#666664]">
              Are you sure you want to remove <span className="font-medium text-black">{deleteTarget.name}</span> ({deleteTarget.sku}) from the archive?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-black bg-white border border-[#D4D4D0] rounded-none hover:bg-[#EAEAE6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-medium text-white bg-[#B91C1C] rounded-none hover:bg-[#991B1B] cursor-pointer"
              >
                Delete SKU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

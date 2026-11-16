import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Product, SaleTransaction } from '../types/retail';
import { apiFetch, formatCurrency } from '../utils/api';

interface RecordSaleModalProps {
  products: Product[];
  onClose: () => void;
  onSaleRecorded: () => void;
}

export function RecordSaleModal({ products, onClose, onSaleRecorded }: RecordSaleModalProps) {
  const availableProducts = products.filter((p) => p.stockQty > 0);
  const [productId, setProductId] = useState(availableProducts[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState<SaleTransaction['channel']>('Online Store');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = products.find((p) => p.id === productId);
  const unitPrice = selected ? selected.basePrice * (1 - selected.discountPct / 100) : 0;
  const total = unitPrice * quantity;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity, channel }),
      });
      onSaleRecorded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-sale-title"
        className="w-full max-w-md bg-white border border-[#D4D4D0] rounded-none shadow-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E0E0DC] flex items-center justify-between">
          <h2 id="record-sale-title" className="text-base font-medium tracking-[-0.02em] text-black">
            Record POS Sale Transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-none text-[#666664] hover:text-black hover:bg-[#F4F4F2] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="sale-product" className="block text-xs font-medium text-black">
              Product SKU
            </label>
            <select
              id="sale-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none text-black focus:outline-none focus:border-black"
            >
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} ({p.stockQty} in stock)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sale-qty" className="block text-xs font-medium text-black">
                Quantity
              </label>
              <input
                id="sale-qty"
                type="number"
                min={1}
                max={selected?.stockQty || 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#D4D4D0] rounded-none text-black focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label htmlFor="sale-channel" className="block text-xs font-medium text-black">
                Sales Channel
              </label>
              <select
                id="sale-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as SaleTransaction['channel'])}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-white border border-[#D4D4D0] rounded-none text-black focus:outline-none focus:border-black"
              >
                <option value="Online Store">Online Store</option>
                <option value="Flagship Store">Flagship Store</option>
                <option value="Boutique Partner">Boutique Partner</option>
              </select>
            </div>
          </div>

          {selected && (
            <div className="pt-3 border-t border-[#E6E6E2] flex items-center justify-between text-sm">
              <div className="text-[#666664]">
                Unit ({selected.discountPct}% off):{' '}
                <span className="font-mono text-black tabular-nums">
                  {formatCurrency(unitPrice)}
                </span>
              </div>
              <div className="font-semibold text-black font-mono tabular-nums">
                Total: {formatCurrency(total)}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-none bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-black bg-white border border-[#D4D4D0] rounded-none hover:bg-[#F4F4F2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selected}
              className="px-4 py-2 text-xs font-medium text-white bg-black rounded-none hover:bg-[#1F1F1F] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Complete Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

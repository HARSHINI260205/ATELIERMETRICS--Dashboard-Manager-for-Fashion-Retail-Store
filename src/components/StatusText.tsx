import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { FashionCategory } from '../types/retail';

export function SemanticStatus({
  label,
  tone,
}: {
  label: string;
  tone: 'nominal' | 'warning' | 'critical' | 'neutral' | 'accent';
}) {
  const config = {
    nominal: {
      text: 'text-[#166534]',
      Icon: CheckCircle2,
    },
    warning: {
      text: 'text-[#B45309]',
      Icon: AlertTriangle,
    },
    critical: {
      text: 'text-[#B91C1C]',
      Icon: AlertCircle,
    },
    accent: {
      text: 'text-[#111111]',
      Icon: TrendingUp,
    },
    neutral: {
      text: 'text-[#666664]',
      Icon: Info,
    },
  }[tone];

  const { Icon, text } = config;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${text}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function VelocityIndicator({ pct }: { pct: number }) {
  const positive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs font-medium tabular-nums whitespace-nowrap ${
        positive ? 'text-[#166534]' : 'text-[#B91C1C]'
      }`}
    >
      {positive ? (
        <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>
        {positive ? '+' : ''}
        {pct.toFixed(1)}%
      </span>
    </span>
  );
}

function GarmentVector({ category, stroke }: { category?: FashionCategory; stroke: string }) {
  switch (category) {
    case 'Outerwear':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <path
            d="M22 12L10 22L15 34L20 31V52H44V31L49 34L54 22L42 12L36 16H28L22 12Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="miter"
          />
          <line x1="32" y1="16" x2="32" y2="52" stroke={stroke} strokeWidth="1.5" />
          <path d="M22 28H28M36 28H42" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'Knitwear':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <path
            d="M24 14C26 18 38 18 40 14L52 22L48 34L42 31V50H22V31L16 34L12 22L24 14Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="miter"
          />
          <rect x="25" y="34" width="14" height="8" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'Dresses':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <path
            d="M24 12H40L43 24L50 52H14L21 24L24 12Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="miter"
          />
          <line x1="21" y1="26" x2="43" y2="26" stroke={stroke} strokeWidth="1.5" />
          <line x1="32" y1="26" x2="32" y2="52" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 3" />
        </svg>
      );
    case 'Denim':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <path
            d="M20 12H44L47 52H35L32 28L29 52H17L20 12Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="miter"
          />
          <line x1="19" y1="18" x2="45" y2="18" stroke={stroke} strokeWidth="1.5" />
          <rect x="20" y="32" width="7" height="8" stroke={stroke} strokeWidth="1.2" />
          <rect x="37" y="32" width="7" height="8" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );
    case 'Footwear':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <path
            d="M16 24L28 22L36 34L52 38V48H14V32L16 24Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="miter"
          />
          <line x1="14" y1="43" x2="52" y2="43" stroke={stroke} strokeWidth="1.5" />
          <path d="M22 48V51M30 48V51M38 48V51M46 48V51" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <rect x="16" y="22" width="32" height="24" stroke={stroke} strokeWidth="2" />
          <path d="M22 22C22 14 42 14 42 22" stroke={stroke} strokeWidth="2" />
          <line x1="16" y1="31" x2="48" y2="31" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
  }
}

export function ProductThumb({
  name,
  colorHex,
  category,
  sku,
  size = 'md',
}: {
  imageUrl?: string;
  name: string;
  colorHex: string;
  category?: FashionCategory;
  sku?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (size === 'lg') {
    return (
      <div
        className="w-full aspect-[4/3] bg-[#F2F2EE] border-b border-[#D4D4CE] flex flex-col justify-between p-4 relative overflow-hidden"
        title={name}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #111111 1px, transparent 1px), linear-gradient(to bottom, #111111 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex items-center justify-end">
          <span
            className="w-4 h-4 border border-[#111111]/30 shrink-0"
            style={{ backgroundColor: colorHex }}
            aria-hidden="true"
          />
        </div>
        <div className="relative z-10 w-20 h-20 mx-auto my-auto flex items-center justify-center">
          <GarmentVector category={category} stroke="#111111" />
        </div>
        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#666664]">
          <span>{category || 'Archive'}</span>
          {sku && <span>{sku}</span>}
        </div>
      </div>
    );
  }

  const dims = size === 'sm' ? 'w-9 h-9 p-1.5' : 'w-12 h-12 p-2';
  return (
    <div
      className={`${dims} rounded-none border border-[#D4D4CE] bg-[#F2F2EE] flex items-center justify-center shrink-0 relative overflow-hidden`}
      title={name}
    >
      <span
        className="absolute top-0 right-0 w-2 h-2"
        style={{ backgroundColor: colorHex }}
        aria-hidden="true"
      />
      <GarmentVector category={category} stroke="#111111" />
    </div>
  );
}

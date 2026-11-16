import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AdminProfile,
  FashionCategory,
  FashionSeason,
  InventoryLog,
  MonthlyProductHistory,
  Product,
  SaleTransaction,
} from '../src/types/retail.ts';

export interface StoredAdmin extends AdminProfile {
  passwordHash: string;
}

export interface RetailDatabase {
  admin: StoredAdmin;
  products: Product[];
  monthlyHistory: MonthlyProductHistory[];
  sales: SaleTransaction[];
  inventoryLogs: InventoryLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'retail_db.json');

export function hashPassword(password: string, salt?: string): string {
  const usedSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return `${usedSalt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

interface SeedProductSpec {
  id: string;
  sku: string;
  name: string;
  category: FashionCategory;
  size: string;
  color: string;
  colorHex: string;
  costPrice: number;
  basePrice: number;
  discountPct: number;
  stockQty: number;
  reorderPoint: number;
  season: FashionSeason;
  baseMonthlyDemand: number;
  growthSlope: number;
}

const SEED_SPECS: SeedProductSpec[] = [
  {
    id: 'prod-01',
    sku: 'ATL-OW-101',
    name: '3L Technical Shell Parka',
    category: 'Outerwear',
    size: 'L',
    color: 'Matte Charcoal',
    colorHex: '#2B2D2F',
    costPrice: 10800,
    basePrice: 29990,
    discountPct: 0,
    stockQty: 14, // Low / Critical against winter drop surge
    reorderPoint: 30,
    season: 'Winter',
    baseMonthlyDemand: 48,
    growthSlope: 1.4,
  },
  {
    id: 'prod-02',
    sku: 'ATL-KN-204',
    name: 'Distressed Heavyweight Boxy Hoodie',
    category: 'Knitwear',
    size: 'L',
    color: 'Washed Onyx',
    colorHex: '#1F1F21',
    costPrice: 6200,
    basePrice: 18500,
    discountPct: 5,
    stockQty: 9, // Critical low stock
    reorderPoint: 28,
    season: 'Autumn',
    baseMonthlyDemand: 54,
    growthSlope: 1.8,
  },
  {
    id: 'prod-03',
    sku: 'ATL-DR-309',
    name: 'Asymmetric Nylon Parachute Dress',
    category: 'Dresses',
    size: 'S',
    color: 'Olive Drab',
    colorHex: '#3B4437',
    costPrice: 7800,
    basePrice: 24500,
    discountPct: 10,
    stockQty: 42,
    reorderPoint: 20,
    season: 'Spring',
    baseMonthlyDemand: 32,
    growthSlope: 0.5,
  },
  {
    id: 'prod-04',
    sku: 'ATL-DN-412',
    name: 'Wide-Leg Raw Selvedge Carpenter',
    category: 'Denim',
    size: '32',
    color: 'Deep Indigo',
    colorHex: '#1E293B',
    costPrice: 3900,
    basePrice: 15800,
    discountPct: 0,
    stockQty: 68,
    reorderPoint: 35,
    season: 'All-Season',
    baseMonthlyDemand: 62,
    growthSlope: 0.9,
  },
  {
    id: 'prod-05',
    sku: 'ATL-FW-503',
    name: 'Lug-Sole Leather Platform Derby',
    category: 'Footwear',
    size: '42',
    color: 'Obsidian Black',
    colorHex: '#111111',
    costPrice: 9500,
    basePrice: 27500,
    discountPct: 0,
    stockQty: 18,
    reorderPoint: 24,
    season: 'Autumn',
    baseMonthlyDemand: 41,
    growthSlope: 1.2,
  },
  {
    id: 'prod-06',
    sku: 'ATL-DR-318',
    name: 'Deconstructed Poplin Utility Dress',
    category: 'Dresses',
    size: 'M',
    color: 'Concrete Chalk',
    colorHex: '#D6D4CD',
    costPrice: 4600,
    basePrice: 14900,
    discountPct: 0,
    stockQty: 96, // Overstock / slow-moving in Nov
    reorderPoint: 18,
    season: 'Summer',
    baseMonthlyDemand: 24,
    growthSlope: -0.6,
  },
  {
    id: 'prod-07',
    sku: 'ATL-OW-115',
    name: 'Cropped Ripstop MA-1 Flight Bomber',
    category: 'Outerwear',
    size: 'L',
    color: 'Sage Olive',
    colorHex: '#4B5548',
    costPrice: 6900,
    basePrice: 20900,
    discountPct: 0,
    stockQty: 26,
    reorderPoint: 22,
    season: 'Winter',
    baseMonthlyDemand: 44,
    growthSlope: 1.5,
  },
  {
    id: 'prod-08',
    sku: 'ATL-KN-219',
    name: 'Brushed Mohair Oversized Crewneck',
    category: 'Knitwear',
    size: 'M',
    color: 'Ash Heather',
    colorHex: '#C8C6BF',
    costPrice: 4900,
    basePrice: 14990,
    discountPct: 0,
    stockQty: 84, // Overstock candidate for discount
    reorderPoint: 20,
    season: 'Spring',
    baseMonthlyDemand: 21,
    growthSlope: -0.4,
  },
  {
    id: 'prod-09',
    sku: 'ATL-AC-602',
    name: 'Ballistic Cordura Crossbody Sling',
    category: 'Accessories',
    size: 'One Size',
    color: 'Jet Black',
    colorHex: '#1A1A1A',
    costPrice: 5800,
    basePrice: 19900,
    discountPct: 0,
    stockQty: 31,
    reorderPoint: 25,
    season: 'All-Season',
    baseMonthlyDemand: 38,
    growthSlope: 0.8,
  },
  {
    id: 'prod-10',
    sku: 'ATL-DN-427',
    name: 'Double-Knee Overdyed Cargo Pant',
    category: 'Denim',
    size: '30',
    color: 'Stone Ecru',
    colorHex: '#DCD8CC',
    costPrice: 3750,
    basePrice: 13900,
    discountPct: 5,
    stockQty: 78, // Slow-moving overstock
    reorderPoint: 20,
    season: 'Summer',
    baseMonthlyDemand: 19,
    growthSlope: -0.3,
  },
  {
    id: 'prod-11',
    sku: 'ATL-FW-514',
    name: 'Technical Mesh Trail Runner',
    category: 'Footwear',
    size: '41',
    color: 'Concrete Grey',
    colorHex: '#7C7D7A',
    costPrice: 7500,
    basePrice: 22500,
    discountPct: 10,
    stockQty: 11, // Low stock
    reorderPoint: 20,
    season: 'Spring',
    baseMonthlyDemand: 29,
    growthSlope: 0.4,
  },
  {
    id: 'prod-12',
    sku: 'ATL-AC-615',
    name: 'Ribbed Merino Short Watch Cap',
    category: 'Accessories',
    size: 'One Size',
    color: 'Signal Vermilion',
    colorHex: '#E53E1D',
    costPrice: 2450,
    basePrice: 7990,
    discountPct: 0,
    stockQty: 12, // Critical low before peak winter
    reorderPoint: 30,
    season: 'Winter',
    baseMonthlyDemand: 52,
    growthSlope: 1.9,
  },
];

function seasonMultiplier(productSeason: FashionSeason, month: number): number {
  if (productSeason === 'All-Season') {
    return month === 11 || month === 12 ? 1.18 : 1.0;
  }
  const seasonMonths: Record<Exclude<FashionSeason, 'All-Season'>, number[]> = {
    Spring: [3, 4, 5],
    Summer: [6, 7, 8],
    Autumn: [9, 10, 11],
    Winter: [12, 1, 2],
  };
  const peak = seasonMonths[productSeason];
  if (peak.includes(month)) return 1.48;
  const preMonth = peak[0] === 1 ? 12 : peak[0] - 1;
  if (month === preMonth) return 1.24;
  const postMonth = peak[2] === 12 ? 1 : peak[2] + 1;
  if (month === postMonth) return 0.92;
  return 0.56;
}

export function createSeedDatabase(): RetailDatabase {
  const nowIso = '2026-11-15T09:00:00.000Z';
  const products: Product[] = SEED_SPECS.map((spec) => ({
    id: spec.id,
    sku: spec.sku,
    name: spec.name,
    category: spec.category,
    size: spec.size,
    color: spec.color,
    colorHex: spec.colorHex,
    costPrice: spec.costPrice,
    basePrice: spec.basePrice,
    discountPct: spec.discountPct,
    stockQty: spec.stockQty,
    reorderPoint: spec.reorderPoint,
    season: spec.season,
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: nowIso,
  }));

  const months: Array<{ yearMonth: string; month: number }> = [
    { yearMonth: '2025-10', month: 10 },
    { yearMonth: '2025-11', month: 11 },
    { yearMonth: '2025-12', month: 12 },
    { yearMonth: '2026-01', month: 1 },
    { yearMonth: '2026-02', month: 2 },
    { yearMonth: '2026-03', month: 3 },
    { yearMonth: '2026-04', month: 4 },
    { yearMonth: '2026-05', month: 5 },
    { yearMonth: '2026-06', month: 6 },
    { yearMonth: '2026-07', month: 7 },
    { yearMonth: '2026-08', month: 8 },
    { yearMonth: '2026-09', month: 9 },
    { yearMonth: '2026-10', month: 10 },
    { yearMonth: '2026-11', month: 11 },
  ];

  const monthlyHistory: MonthlyProductHistory[] = [];
  SEED_SPECS.forEach((spec, sIdx) => {
    months.forEach((m, mIdx) => {
      const sMult = seasonMultiplier(spec.season, m.month);
      const promoDisc =
        m.month === 1 || m.month === 7 || (sMult < 0.7 && mIdx % 2 === 0)
          ? 15
          : spec.discountPct;
      const discountBoost = 1 + promoDisc * 0.015;
      const deterministicWave = Math.sin((sIdx + 1) * 1.7 + mIdx * 0.9) * 0.08;
      const rawUnits =
        (spec.baseMonthlyDemand + spec.growthSlope * mIdx) *
        sMult *
        discountBoost *
        (1 + deterministicWave);
      const unitsSold = Math.max(6, Math.round(rawUnits));
      const avgPrice = Number((spec.basePrice * (1 - promoDisc / 100)).toFixed(2));
      const revenue = Number((unitsSold * avgPrice).toFixed(2));

      monthlyHistory.push({
        id: `hist-${spec.id}-${m.yearMonth}`,
        productId: spec.id,
        yearMonth: m.yearMonth,
        month: m.month,
        unitsSold,
        avgPrice,
        discountPct: promoDisc,
        revenue,
      });
    });
  });

  const channels: SaleTransaction['channel'][] = [
    'Online Store',
    'Flagship Store',
    'Boutique Partner',
  ];
  const sales: SaleTransaction[] = [];
  for (let day = 1; day <= 15; day++) {
    const spec1 = SEED_SPECS[(day * 3) % SEED_SPECS.length];
    const spec2 = SEED_SPECS[(day * 5 + 2) % SEED_SPECS.length];
    [spec1, spec2].forEach((spec, idx) => {
      const qty = ((day + idx) % 4) + 1;
      const unitPrice = Number((spec.basePrice * (1 - spec.discountPct / 100)).toFixed(2));
      sales.push({
        id: `sale-${day}-${idx}-${spec.id}`,
        productId: spec.id,
        sku: spec.sku,
        productName: spec.name,
        category: spec.category,
        quantity: qty,
        unitPrice,
        discountPct: spec.discountPct,
        totalAmount: Number((qty * unitPrice).toFixed(2)),
        channel: channels[(day + idx) % channels.length],
        soldAt: `2026-11-${String(day).padStart(2, '0')}T${String(10 + idx * 4).padStart(2, '0')}:25:00.000Z`,
      });
    });
  }
  sales.sort((a, b) => b.soldAt.localeCompare(a.soldAt));

  const inventoryLogs: InventoryLog[] = [
    {
      id: 'log-1',
      productId: 'prod-04',
      sku: 'ATL-DN-412',
      productName: 'Wide-Leg Raw Selvedge Carpenter',
      delta: 40,
      previousQty: 28,
      newQty: 68,
      reason: 'Drop 04 Core Replenishment PO #4812',
      actor: 'Elena Vance',
      createdAt: '2026-11-12T14:20:00.000Z',
    },
    {
      id: 'log-2',
      productId: 'prod-01',
      sku: 'ATL-OW-101',
      productName: '3L Technical Shell Parka',
      delta: -12,
      previousQty: 26,
      newQty: 14,
      reason: 'AW26 Core Store Allocation',
      actor: 'System POS',
      createdAt: '2026-11-14T17:45:00.000Z',
    },
  ];

  return {
    admin: {
      id: 'admin-01',
      email: 'admin@ateliermetrics.com',
      name: 'Elena Vance',
      role: 'Merchandising Director',
      avatarUrl: '',
      passwordHash: hashPassword('FashionML@2026'),
    },
    products,
    monthlyHistory,
    sales,
    inventoryLogs,
  };
}

class RetailStore {
  private db: RetailDatabase;

  constructor() {
    this.db = this.load();
  }

  private load(): RetailDatabase {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as RetailDatabase;
        const hasLegacyCatalog =
          Array.isArray(parsed?.products) &&
          parsed.products.some(
            (p) => p.name === 'Tailored Wool Trench Coat' || (p.id === 'prod-01' && p.basePrice < 1000),
          );
        const hasLegacyCityRole = parsed?.admin?.role?.includes('SH/TYO/SEL');
        if (
          parsed &&
          Array.isArray(parsed.products) &&
          parsed.admin &&
          !hasLegacyCatalog &&
          !hasLegacyCityRole
        ) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load retail_db.json, recreating seed:', err);
    }
    const seed = createSeedDatabase();
    this.persist(seed);
    return seed;
  }

  public persist(nextDb?: RetailDatabase): void {
    const target = nextDb ?? this.db;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(target, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  }

  public getData(): RetailDatabase {
    return this.db;
  }

  public resetToDemo(): RetailDatabase {
    this.db = createSeedDatabase();
    this.persist();
    return this.db;
  }
}

export const retailStore = new RetailStore();

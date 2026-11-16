export type FashionCategory =
  | 'Outerwear'
  | 'Knitwear'
  | 'Dresses'
  | 'Denim'
  | 'Footwear'
  | 'Accessories';

export type FashionSeason = 'Spring' | 'Summer' | 'Autumn' | 'Winter' | 'All-Season';

export type DemandTier = 'Surging' | 'High Demand' | 'Steady Core' | 'Slow-Moving';

export type StockStatus = 'Critical Low' | 'Low Stock' | 'Optimal' | 'Overstock';

export interface Product {
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
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyProductHistory {
  id: string;
  productId: string;
  yearMonth: string; // YYYY-MM
  month: number; // 1..12
  unitsSold: number;
  avgPrice: number;
  discountPct: number;
  revenue: number;
}

export interface SaleTransaction {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  category: FashionCategory;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  totalAmount: number;
  channel: 'Flagship Store' | 'Online Store' | 'Boutique Partner';
  soldAt: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  delta: number;
  previousQty: number;
  newQty: number;
  reason: string;
  actor: string;
  createdAt: string;
}

export interface InventoryAlert {
  productId: string;
  sku: string;
  name: string;
  category: FashionCategory;
  stockQty: number;
  reorderPoint: number;
  predictedNextMonthDemand: number;
  daysOfCover: number;
  severity: 'Critical' | 'Warning' | 'Overstock';
  recommendedRestockQty: number;
  message: string;
}

export interface PriceRecommendation {
  productId: string;
  sku: string;
  name: string;
  category: FashionCategory;
  costPrice: number;
  currentPrice: number;
  currentDiscountPct: number;
  effectivePrice: number;
  marginPct: number;
  stockQty: number;
  predictedDemandAtCurrent: number;
  suggestedPrice: number;
  suggestedDiscountPct: number;
  suggestedEffectivePrice: number;
  predictedDemandAtSuggested: number;
  projectedRevenueDelta: number;
  actionType: 'Markdown Clearance' | 'Seasonal Promo' | 'Margin Lift' | 'Hold Optimal';
  rationale: string;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number; // 0..100 percentage
}

export interface MLModelMetrics {
  algorithm: string;
  nEstimators: number;
  maxDepth: number;
  trainingSamples: number;
  validationSamples: number;
  r2Score: number;
  mae: number;
  rmse: number;
  trainedAt: string;
  featureImportances: FeatureImportanceItem[];
}

export interface ProductForecast {
  productId: string;
  sku: string;
  name: string;
  category: FashionCategory;
  season: FashionSeason;
  currentStock: number;
  reorderPoint: number;
  lastMonthUnits: number;
  rolling3MoAvg: number;
  predictedMonth1: number;
  predictedMonth2: number;
  predictedMonth3: number;
  totalNextQuarterDemand: number;
  demandChangePct: number;
  demandTier: DemandTier;
  stockStatus: StockStatus;
  recommendedOrderQty: number;
  confidenceScore: number;
}

export interface TrendAnalysisItem {
  productId: string;
  sku: string;
  name: string;
  category: FashionCategory;
  color: string;
  colorHex: string;
  season: FashionSeason;
  recentUnits: number;
  priorUnits: number;
  velocityGrowthPct: number;
  demandTier: DemandTier;
  revenueContribution: number;
}

export interface SeasonalPatternRow {
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  Outerwear: number;
  Knitwear: number;
  Dresses: number;
  Denim: number;
  Footwear: number;
  Accessories: number;
  totalUnits: number;
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string;
}

export interface DashboardSummary {
  kpis: {
    totalRevenue: number;
    totalUnitsSold: number;
    inventoryValuation: number;
    lowStockAlertCount: number;
    mlR2Score: number;
    projectedNextMonthUnits: number;
  };
  monthlySeries: Array<{
    month: string;
    actualUnits: number | null;
    predictedUnits: number | null;
    revenue: number | null;
  }>;
  categoryPerformance: Array<{
    category: FashionCategory;
    actualRevenue: number;
    predictedDemandUnits: number;
    stockUnits: number;
  }>;
  topRecommendations: PriceRecommendation[];
  criticalAlerts: InventoryAlert[];
  topTrending: TrendAnalysisItem[];
}

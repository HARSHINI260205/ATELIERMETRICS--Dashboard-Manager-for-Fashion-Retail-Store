import type {
  DashboardSummary,
  FashionCategory,
  InventoryAlert,
  PriceRecommendation,
  ProductForecast,
  SeasonalPatternRow,
  TrendAnalysisItem,
} from '../src/types/retail.ts';
import { RandomForestRegressorModel } from './ml/randomForest.ts';
import { retailStore } from './store.ts';

const CURRENT_MONTH = 11; // November 2026
const CATEGORIES: FashionCategory[] = [
  'Outerwear',
  'Knitwear',
  'Dresses',
  'Denim',
  'Footwear',
  'Accessories',
];

let rfModel = new RandomForestRegressorModel({ nEstimators: 40, maxDepth: 8 });
let isTrained = false;

export function ensureModelTrained(config?: { nEstimators?: number; maxDepth?: number }) {
  if (!isTrained || config) {
    if (config) {
      rfModel = new RandomForestRegressorModel({
        nEstimators: config.nEstimators ?? 40,
        maxDepth: config.maxDepth ?? 8,
      });
    }
    const db = retailStore.getData();
    rfModel.train(db.products, db.monthlyHistory);
    isTrained = true;
  }
  return rfModel;
}

export function getAllForecasts(): ProductForecast[] {
  const model = ensureModelTrained();
  const db = retailStore.getData();

  return db.products.map((product) => {
    const prodHist = db.monthlyHistory.filter((h) => h.productId === product.id);
    return model.predictProductNextQuarter(product, prodHist, CURRENT_MONTH);
  });
}

export function getInventoryAlerts(): InventoryAlert[] {
  const forecasts = getAllForecasts();
  const db = retailStore.getData();
  const prodMap = new Map(db.products.map((p) => [p.id, p]));
  const alerts: InventoryAlert[] = [];

  for (const fc of forecasts) {
    const product = prodMap.get(fc.productId);
    if (!product) continue;
    const dailyDemand = Math.max(0.25, fc.predictedMonth1 / 30);
    const daysOfCover = Math.round(product.stockQty / dailyDemand);

    if (product.stockQty <= Math.max(5, Math.floor(product.reorderPoint * 0.5)) || daysOfCover <= 10) {
      alerts.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        stockQty: product.stockQty,
        reorderPoint: product.reorderPoint,
        predictedNextMonthDemand: fc.predictedMonth1,
        daysOfCover,
        severity: 'Critical',
        recommendedRestockQty: Math.max(15, fc.recommendedOrderQty),
        message: `Only ${daysOfCover} days of cover remaining against ${fc.predictedMonth1} predicted units next month.`,
      });
    } else if (product.stockQty <= product.reorderPoint || product.stockQty < fc.predictedMonth1) {
      alerts.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        stockQty: product.stockQty,
        reorderPoint: product.reorderPoint,
        predictedNextMonthDemand: fc.predictedMonth1,
        daysOfCover,
        severity: 'Warning',
        recommendedRestockQty: Math.max(10, fc.recommendedOrderQty),
        message: `Below reorder threshold (${product.reorderPoint} units). Reorder ${Math.max(10, fc.recommendedOrderQty)} units to avoid stockout.`,
      });
    } else if (product.stockQty > fc.predictedMonth1 * 2.8) {
      alerts.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        stockQty: product.stockQty,
        reorderPoint: product.reorderPoint,
        predictedNextMonthDemand: fc.predictedMonth1,
        daysOfCover,
        severity: 'Overstock',
        recommendedRestockQty: 0,
        message: `High inventory carrying load (${daysOfCover} days cover). Eligible for seasonal markdown.`,
      });
    }
  }

  const order = { Critical: 0, Warning: 1, Overstock: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function getPriceRecommendations(): PriceRecommendation[] {
  const model = ensureModelTrained();
  const db = retailStore.getData();
  const forecasts = getAllForecasts();
  const fcMap = new Map(forecasts.map((f) => [f.productId, f]));

  return db.products.map((product) => {
    const prodHist = db.monthlyHistory.filter((h) => h.productId === product.id);
    const fc = fcMap.get(product.id)!;
    const effectivePrice = Number((product.basePrice * (1 - product.discountPct / 100)).toFixed(2));
    const marginPct =
      effectivePrice > 0
        ? Number((((effectivePrice - product.costPrice) / effectivePrice) * 100).toFixed(1))
        : 0;

    let suggestedPrice = product.basePrice;
    let suggestedDiscountPct = product.discountPct;
    let actionType: PriceRecommendation['actionType'] = 'Hold Optimal';
    let rationale = 'Current price and velocity align with target gross margin.';

    const isSlowMoving = fc.demandTier === 'Slow-Moving' || product.stockQty > fc.predictedMonth1 * 2.6;
    const isSurgingLowStock =
      (fc.demandTier === 'Surging' || fc.demandTier === 'High Demand') &&
      product.stockQty < fc.predictedMonth1;

    if (isSlowMoving && product.discountPct < 20) {
      suggestedDiscountPct = product.stockQty > fc.predictedMonth1 * 3.2 ? 25 : 15;
      actionType = 'Markdown Clearance';
      rationale = `Slow-moving stock (${product.stockQty} on hand vs ${fc.predictedMonth1} predicted). ${suggestedDiscountPct}% seasonal markdown accelerates sell-through while preserving positive margin.`;
    } else if (isSurgingLowStock) {
      suggestedDiscountPct = 0;
      suggestedPrice = Math.round(product.basePrice * 1.06);
      actionType = 'Margin Lift';
      rationale = `High demand (${fc.predictedMonth1} units) with tight inventory (${product.stockQty} left). Eliminating discount and +6% price lift protects margin until restock arrives.`;
    } else if (fc.demandTier === 'Steady Core' && product.stockQty > fc.predictedMonth1 * 1.8 && product.discountPct === 0) {
      suggestedDiscountPct = 10;
      actionType = 'Seasonal Promo';
      rationale = `Moderate 10% seasonal promo increases monthly unit turnover with minimal margin dilution.`;
    }

    const suggestedEffectivePrice = Number(
      (suggestedPrice * (1 - suggestedDiscountPct / 100)).toFixed(2),
    );

    const sim = model.simulateWhatIf({
      product,
      productHistory: prodHist,
      targetMonth: 12,
      proposedPrice: suggestedPrice,
      proposedDiscountPct: suggestedDiscountPct,
    });

    const currentRev = fc.predictedMonth1 * effectivePrice;
    const projectedRev = sim.predictedUnits * suggestedEffectivePrice;
    const projectedRevenueDelta = Number((projectedRev - currentRev).toFixed(2));

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      costPrice: product.costPrice,
      currentPrice: product.basePrice,
      currentDiscountPct: product.discountPct,
      effectivePrice,
      marginPct,
      stockQty: product.stockQty,
      predictedDemandAtCurrent: fc.predictedMonth1,
      suggestedPrice,
      suggestedDiscountPct,
      suggestedEffectivePrice,
      predictedDemandAtSuggested:
        actionType === 'Hold Optimal' ? fc.predictedMonth1 : sim.predictedUnits,
      projectedRevenueDelta: actionType === 'Hold Optimal' ? 0 : projectedRevenueDelta,
      actionType,
      rationale,
    };
  });
}

export function getTrendAnalysis(): {
  items: TrendAnalysisItem[];
  seasonalMatrix: SeasonalPatternRow[];
  colorBreakdown: Array<{ color: string; colorHex: string; units: number }>;
} {
  const db = retailStore.getData();
  const forecasts = getAllForecasts();
  const fcMap = new Map(forecasts.map((f) => [f.productId, f]));

  const items: TrendAnalysisItem[] = db.products.map((product) => {
    const rows = db.monthlyHistory
      .filter((h) => h.productId === product.id)
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    const recent3 = rows.slice(-3);
    const prior3 = rows.slice(-6, -3);
    const recentUnits = recent3.reduce((s, r) => s + r.unitsSold, 0);
    const priorUnits = prior3.reduce((s, r) => s + r.unitsSold, 0) || recentUnits;
    const velocityGrowthPct = Number((((recentUnits - priorUnits) / priorUnits) * 100).toFixed(1));
    const revenueContribution = Number(
      rows.reduce((s, r) => s + r.revenue, 0).toFixed(2),
    );
    const fc = fcMap.get(product.id)!;

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      color: product.color,
      colorHex: product.colorHex,
      season: product.season,
      recentUnits,
      priorUnits,
      velocityGrowthPct,
      demandTier: fc.demandTier,
      revenueContribution,
    };
  });

  items.sort((a, b) => b.velocityGrowthPct - a.velocityGrowthPct);

  const seasonMap: Record<'Spring' | 'Summer' | 'Autumn' | 'Winter', number[]> = {
    Spring: [3, 4, 5],
    Summer: [6, 7, 8],
    Autumn: [9, 10, 11],
    Winter: [12, 1, 2],
  };

  const prodMap = new Map(db.products.map((p) => [p.id, p]));
  const seasonalMatrix: SeasonalPatternRow[] = (
    ['Spring', 'Summer', 'Autumn', 'Winter'] as const
  ).map((seasonName) => {
    const months = seasonMap[seasonName];
    const counts: Record<FashionCategory, number> = {
      Outerwear: 0,
      Knitwear: 0,
      Dresses: 0,
      Denim: 0,
      Footwear: 0,
      Accessories: 0,
    };
    for (const h of db.monthlyHistory) {
      if (!months.includes(h.month)) continue;
      const p = prodMap.get(h.productId);
      if (p) {
        counts[p.category] += h.unitsSold;
      }
    }
    const totalUnits = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      season: seasonName,
      ...counts,
      totalUnits,
    };
  });

  const colorMap = new Map<string, { color: string; colorHex: string; units: number }>();
  for (const item of items) {
    const existing = colorMap.get(item.color);
    if (existing) {
      existing.units += item.recentUnits;
    } else {
      colorMap.set(item.color, {
        color: item.color,
        colorHex: item.colorHex,
        units: item.recentUnits,
      });
    }
  }
  const colorBreakdown = Array.from(colorMap.values()).sort((a, b) => b.units - a.units);

  return { items, seasonalMatrix, colorBreakdown };
}

export function getDashboardSummary(): DashboardSummary {
  const model = ensureModelTrained();
  const db = retailStore.getData();
  const forecasts = getAllForecasts();
  const alerts = getInventoryAlerts();
  const recommendations = getPriceRecommendations();
  const { items: trendItems } = getTrendAnalysis();

  const totalRevenue = Number(
    db.monthlyHistory.reduce((acc, row) => acc + row.revenue, 0).toFixed(2),
  );
  const totalUnitsSold = db.monthlyHistory.reduce((acc, row) => acc + row.unitsSold, 0);
  const inventoryValuation = Number(
    db.products
      .reduce((acc, p) => acc + p.stockQty * p.basePrice * (1 - p.discountPct / 100), 0)
      .toFixed(2),
  );
  const lowStockAlertCount = alerts.filter(
    (a) => a.severity === 'Critical' || a.severity === 'Warning',
  ).length;
  const projectedNextMonthUnits = forecasts.reduce((acc, f) => acc + f.predictedMonth1, 0);

  // Build 12-month historical + 3-month ML forecast series
  const monthBuckets = new Map<string, { units: number; revenue: number }>();
  for (const row of db.monthlyHistory) {
    const prev = monthBuckets.get(row.yearMonth) ?? { units: 0, revenue: 0 };
    prev.units += row.unitsSold;
    prev.revenue += row.revenue;
    monthBuckets.set(row.yearMonth, prev);
  }

  const sortedMonths = Array.from(monthBuckets.keys()).sort().slice(-9);
  const monthlySeries: DashboardSummary['monthlySeries'] = sortedMonths.map((ym, idx) => {
    const b = monthBuckets.get(ym)!;
    return {
      month: ym,
      actualUnits: b.units,
      // Overlay model fit on latest historical month for continuity
      predictedUnits: idx === sortedMonths.length - 1 ? b.units : null,
      revenue: Number(b.revenue.toFixed(2)),
    };
  });

  const nextMonth1Total = forecasts.reduce((s, f) => s + f.predictedMonth1, 0);
  const nextMonth2Total = forecasts.reduce((s, f) => s + f.predictedMonth2, 0);
  const nextMonth3Total = forecasts.reduce((s, f) => s + f.predictedMonth3, 0);

  monthlySeries.push(
    { month: '2026-12 (ML)', actualUnits: null, predictedUnits: nextMonth1Total, revenue: null },
    { month: '2027-01 (ML)', actualUnits: null, predictedUnits: nextMonth2Total, revenue: null },
    { month: '2027-02 (ML)', actualUnits: null, predictedUnits: nextMonth3Total, revenue: null },
  );

  const categoryPerformance = CATEGORIES.map((cat) => {
    const catProducts = db.products.filter((p) => p.category === cat);
    const catIds = new Set(catProducts.map((p) => p.id));
    const actualRevenue = Number(
      db.monthlyHistory
        .filter((h) => catIds.has(h.productId))
        .reduce((s, h) => s + h.revenue, 0)
        .toFixed(2),
    );
    const predictedDemandUnits = forecasts
      .filter((f) => f.category === cat)
      .reduce((s, f) => s + f.predictedMonth1, 0);
    const stockUnits = catProducts.reduce((s, p) => s + p.stockQty, 0);
    return {
      category: cat,
      actualRevenue,
      predictedDemandUnits,
      stockUnits,
    };
  });

  return {
    kpis: {
      totalRevenue,
      totalUnitsSold,
      inventoryValuation,
      lowStockAlertCount,
      mlR2Score: model.metrics.r2Score,
      projectedNextMonthUnits,
    },
    monthlySeries,
    categoryPerformance,
    topRecommendations: recommendations.filter((r) => r.actionType !== 'Hold Optimal').slice(0, 5),
    criticalAlerts: alerts.slice(0, 5),
    topTrending: trendItems.slice(0, 5),
  };
}

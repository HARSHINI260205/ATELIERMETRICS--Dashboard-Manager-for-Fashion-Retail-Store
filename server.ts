import crypto from 'node:crypto';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  ensureModelTrained,
  getAllForecasts,
  getDashboardSummary,
  getInventoryAlerts,
  getPriceRecommendations,
  getTrendAnalysis,
} from './server/analytics.ts';
import {
  clearSessionCookie,
  getTokenFromRequest,
  requireAdmin,
  setSessionCookie,
  signSessionToken,
  verifySessionToken,
} from './server/auth.ts';
import { hashPassword, retailStore, verifyPassword } from './server/store.ts';
import type { FashionCategory, FashionSeason, Product, SaleTransaction } from './src/types/retail.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Train initial Random Forest Regression ensemble on startup
  ensureModelTrained();

  // ---------------- AUTH ROUTES ----------------
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    const db = retailStore.getData();

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.trim().toLowerCase() !== db.admin.email.toLowerCase() ||
      !verifyPassword(password, db.admin.passwordHash)
    ) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signSessionToken({
      adminId: db.admin.id,
      email: db.admin.email,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    setSessionCookie(res, token);
    res.json({
      token,
      admin: {
        id: db.admin.id,
        email: db.admin.email,
        name: db.admin.name,
        role: db.admin.role,
        avatarUrl: db.admin.avatarUrl,
      },
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const payload = verifySessionToken(token);
    const db = retailStore.getData();
    if (!payload || payload.adminId !== db.admin.id) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    res.json({
      admin: {
        id: db.admin.id,
        email: db.admin.email,
        name: db.admin.name,
        role: db.admin.role,
        avatarUrl: db.admin.avatarUrl,
      },
    });
  });

  app.post('/api/auth/password', requireAdmin, (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }
    const db = retailStore.getData();
    if (!verifyPassword(currentPassword, db.admin.passwordHash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }
    db.admin.passwordHash = hashPassword(newPassword);
    retailStore.persist();
    res.json({ ok: true, message: 'Admin password updated successfully.' });
  });

  // ---------------- DASHBOARD ----------------
  app.get('/api/dashboard', requireAdmin, (_req, res) => {
    res.json(getDashboardSummary());
  });

  // ---------------- PRODUCTS CRUD ----------------
  app.get('/api/products', requireAdmin, (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const season = typeof req.query.season === 'string' ? req.query.season.trim() : '';

    let products = retailStore.getData().products;
    if (q) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.color.toLowerCase().includes(q),
      );
    }
    if (category && category !== 'All') {
      products = products.filter((p) => p.category === category);
    }
    if (season && season !== 'All') {
      products = products.filter((p) => p.season === season);
    }

    res.json({ products });
  });

  app.post('/api/products', requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const db = retailStore.getData();

    if (!body.name || !body.sku || !body.category) {
      res.status(400).json({ error: 'SKU, product name, and category are required.' });
      return;
    }

    const duplicate = db.products.some(
      (p) => p.sku.toLowerCase() === String(body.sku).trim().toLowerCase(),
    );
    if (duplicate) {
      res.status(409).json({ error: 'A product with this SKU already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      sku: String(body.sku).trim().toUpperCase(),
      name: String(body.name).trim(),
      category: body.category as FashionCategory,
      size: String(body.size || 'M').trim(),
      color: String(body.color || 'Obsidian').trim(),
      colorHex: String(body.colorHex || '#1E293B').trim(),
      costPrice: Math.max(1, Number(body.costPrice) || 40),
      basePrice: Math.max(1, Number(body.basePrice) || 120),
      discountPct: Math.min(80, Math.max(0, Number(body.discountPct) || 0)),
      stockQty: Math.max(0, Math.round(Number(body.stockQty) || 0)),
      reorderPoint: Math.max(1, Math.round(Number(body.reorderPoint) || 20)),
      season: (body.season as FashionSeason) || 'All-Season',
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.products.unshift(newProduct);

    // Seed baseline 4 months of synthetic history for new SKU so ML forecast works immediately
    const baseUnits = Math.max(12, Math.round(newProduct.reorderPoint * 1.1));
    const recentMonths = [
      { ym: '2026-08', m: 8 },
      { ym: '2026-09', m: 9 },
      { ym: '2026-10', m: 10 },
      { ym: '2026-11', m: 11 },
    ];
    for (const rm of recentMonths) {
      const avgPrice = Number(
        (newProduct.basePrice * (1 - newProduct.discountPct / 100)).toFixed(2),
      );
      db.monthlyHistory.push({
        id: `hist-${newProduct.id}-${rm.ym}`,
        productId: newProduct.id,
        yearMonth: rm.ym,
        month: rm.m,
        unitsSold: baseUnits,
        avgPrice,
        discountPct: newProduct.discountPct,
        revenue: Number((baseUnits * avgPrice).toFixed(2)),
      });
    }

    retailStore.persist();
    res.status(201).json({ product: newProduct });
  });

  app.put('/api/products/:id', requireAdmin, (req, res) => {
    const db = retailStore.getData();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const existing = db.products[idx];
    const body = req.body ?? {};

    const updated: Product = {
      ...existing,
      sku: body.sku ? String(body.sku).trim().toUpperCase() : existing.sku,
      name: body.name ? String(body.name).trim() : existing.name,
      category: (body.category as FashionCategory) || existing.category,
      size: body.size ? String(body.size).trim() : existing.size,
      color: body.color ? String(body.color).trim() : existing.color,
      colorHex: body.colorHex ? String(body.colorHex).trim() : existing.colorHex,
      costPrice: body.costPrice !== undefined ? Math.max(1, Number(body.costPrice)) : existing.costPrice,
      basePrice: body.basePrice !== undefined ? Math.max(1, Number(body.basePrice)) : existing.basePrice,
      discountPct:
        body.discountPct !== undefined
          ? Math.min(80, Math.max(0, Number(body.discountPct)))
          : existing.discountPct,
      stockQty:
        body.stockQty !== undefined ? Math.max(0, Math.round(Number(body.stockQty))) : existing.stockQty,
      reorderPoint:
        body.reorderPoint !== undefined
          ? Math.max(1, Math.round(Number(body.reorderPoint)))
          : existing.reorderPoint,
      season: (body.season as FashionSeason) || existing.season,
      updatedAt: new Date().toISOString(),
    };

    db.products[idx] = updated;
    retailStore.persist();
    res.json({ product: updated });
  });

  app.delete('/api/products/:id', requireAdmin, (req, res) => {
    const db = retailStore.getData();
    const exists = db.products.some((p) => p.id === req.params.id);
    if (!exists) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    db.products = db.products.filter((p) => p.id !== req.params.id);
    db.monthlyHistory = db.monthlyHistory.filter((h) => h.productId !== req.params.id);
    retailStore.persist();
    res.json({ ok: true });
  });

  // ---------------- INVENTORY & ALERTS ----------------
  app.get('/api/inventory', requireAdmin, (_req, res) => {
    const db = retailStore.getData();
    res.json({
      products: db.products,
      alerts: getInventoryAlerts(),
      logs: db.inventoryLogs.slice(0, 40),
    });
  });

  app.post('/api/inventory/restock', requireAdmin, (req, res) => {
    const { productId, quantity, reason } = req.body ?? {};
    const qty = Math.round(Number(quantity));
    if (!productId || !Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ error: 'Valid productId and positive restock quantity required.' });
      return;
    }

    const db = retailStore.getData();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const previousQty = product.stockQty;
    product.stockQty += qty;
    product.updatedAt = new Date().toISOString();

    db.inventoryLogs.unshift({
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      delta: qty,
      previousQty,
      newQty: product.stockQty,
      reason: String(reason || 'Manual Replenishment Order').trim(),
      actor: db.admin.name,
      createdAt: new Date().toISOString(),
    });

    retailStore.persist();
    res.json({ product, alerts: getInventoryAlerts(), logs: db.inventoryLogs.slice(0, 40) });
  });

  // ---------------- SALES ANALYTICS ----------------
  app.get('/api/sales', requireAdmin, (_req, res) => {
    const db = retailStore.getData();
    const monthlyTotals = new Map<string, { yearMonth: string; units: number; revenue: number }>();
    for (const h of db.monthlyHistory) {
      const curr = monthlyTotals.get(h.yearMonth) ?? {
        yearMonth: h.yearMonth,
        units: 0,
        revenue: 0,
      };
      curr.units += h.unitsSold;
      curr.revenue = Number((curr.revenue + h.revenue).toFixed(2));
      monthlyTotals.set(h.yearMonth, curr);
    }

    const dailyTotals = new Map<string, { date: string; units: number; revenue: number }>();
    for (const s of db.sales) {
      const date = s.soldAt.slice(0, 10);
      const curr = dailyTotals.get(date) ?? { date, units: 0, revenue: 0 };
      curr.units += s.quantity;
      curr.revenue = Number((curr.revenue + s.totalAmount).toFixed(2));
      dailyTotals.set(date, curr);
    }

    const productPerformance = db.products.map((p) => {
      const hist = db.monthlyHistory.filter((h) => h.productId === p.id);
      const totalUnits = hist.reduce((s, h) => s + h.unitsSold, 0);
      const totalRevenue = Number(hist.reduce((s, h) => s + h.revenue, 0).toFixed(2));
      const totalCost = totalUnits * p.costPrice;
      const grossProfit = Number((totalRevenue - totalCost).toFixed(2));
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        totalUnits,
        totalRevenue,
        grossProfit,
        stockQty: p.stockQty,
      };
    });

    res.json({
      transactions: db.sales.slice(0, 100),
      monthlySeries: Array.from(monthlyTotals.values()).sort((a, b) =>
        a.yearMonth.localeCompare(b.yearMonth),
      ),
      dailySeries: Array.from(dailyTotals.values()).sort((a, b) => a.date.localeCompare(b.date)),
      productPerformance: productPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue),
    });
  });

  app.post('/api/sales', requireAdmin, (req, res) => {
    const { productId, quantity, channel } = req.body ?? {};
    const qty = Math.round(Number(quantity));
    if (!productId || !Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ error: 'Valid product and positive quantity are required.' });
      return;
    }

    const db = retailStore.getData();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    if (product.stockQty < qty) {
      res.status(400).json({ error: `Insufficient stock (${product.stockQty} units available).` });
      return;
    }

    const effectiveUnitPrice = Number(
      (product.basePrice * (1 - product.discountPct / 100)).toFixed(2),
    );
    const totalAmount = Number((effectiveUnitPrice * qty).toFixed(2));
    const nowIso = new Date().toISOString();

    const prevQty = product.stockQty;
    product.stockQty -= qty;
    product.updatedAt = nowIso;

    const sale: SaleTransaction = {
      id: `sale-${crypto.randomUUID().slice(0, 8)}`,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      category: product.category,
      quantity: qty,
      unitPrice: effectiveUnitPrice,
      discountPct: product.discountPct,
      totalAmount,
      channel: channel || 'Online Store',
      soldAt: nowIso,
    };

    db.sales.unshift(sale);
    db.inventoryLogs.unshift({
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      delta: -qty,
      previousQty: prevQty,
      newQty: product.stockQty,
      reason: `POS Sale (${sale.channel})`,
      actor: db.admin.name,
      createdAt: nowIso,
    });

    // Update current month aggregate (2026-11)
    const novRow = db.monthlyHistory.find(
      (h) => h.productId === product.id && h.yearMonth === '2026-11',
    );
    if (novRow) {
      novRow.unitsSold += qty;
      novRow.revenue = Number((novRow.revenue + totalAmount).toFixed(2));
    }

    retailStore.persist();
    res.status(201).json({ sale, updatedStock: product.stockQty });
  });

  // ---------------- PRICING & DISCOUNTS ----------------
  app.get('/api/pricing', requireAdmin, (_req, res) => {
    res.json({ recommendations: getPriceRecommendations() });
  });

  app.post('/api/pricing/apply', requireAdmin, (req, res) => {
    const { productId, basePrice, discountPct } = req.body ?? {};
    const db = retailStore.getData();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    if (basePrice !== undefined) {
      product.basePrice = Math.max(1, Number(basePrice));
    }
    if (discountPct !== undefined) {
      product.discountPct = Math.min(75, Math.max(0, Number(discountPct)));
    }
    product.updatedAt = new Date().toISOString();
    retailStore.persist();

    res.json({ product, recommendations: getPriceRecommendations() });
  });

  // ---------------- MACHINE LEARNING RANDOM FOREST ----------------
  app.get('/api/ml/predictions', requireAdmin, (_req, res) => {
    const model = ensureModelTrained();
    res.json({
      metrics: model.metrics,
      forecasts: getAllForecasts(),
    });
  });

  app.post('/api/ml/train', requireAdmin, (req, res) => {
    const { nEstimators, maxDepth } = req.body ?? {};
    const trees = Math.min(120, Math.max(10, Math.round(Number(nEstimators) || 40)));
    const depth = Math.min(14, Math.max(3, Math.round(Number(maxDepth) || 8)));
    const model = ensureModelTrained({ nEstimators: trees, maxDepth: depth });
    res.json({
      metrics: model.metrics,
      forecasts: getAllForecasts(),
    });
  });

  app.post('/api/ml/simulate', requireAdmin, (req, res) => {
    const { productId, targetMonth, proposedPrice, proposedDiscountPct } = req.body ?? {};
    const db = retailStore.getData();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const model = ensureModelTrained();
    const prodHist = db.monthlyHistory.filter((h) => h.productId === product.id);
    const result = model.simulateWhatIf({
      product,
      productHistory: prodHist,
      targetMonth: Math.min(12, Math.max(1, Math.round(Number(targetMonth) || 12))),
      proposedPrice: Math.max(1, Number(proposedPrice) || product.basePrice),
      proposedDiscountPct: Math.min(75, Math.max(0, Number(proposedDiscountPct) || 0)),
    });

    res.json({ simulation: result });
  });

  // ---------------- FASHION TRENDS ----------------
  app.get('/api/trends', requireAdmin, (_req, res) => {
    res.json(getTrendAnalysis());
  });

  // ---------------- ADMIN SYSTEM OPS ----------------
  app.post('/api/admin/reset-data', requireAdmin, (_req, res) => {
    retailStore.resetToDemo();
    ensureModelTrained({ nEstimators: 40, maxDepth: 8 });
    res.json({ ok: true, message: 'Retail database reset to curated demo dataset.' });
  });

  // ---------------- VITE / STATIC SERVING ----------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AtelierMetrics server running on http://localhost:${PORT}`);
  });
}

startServer();

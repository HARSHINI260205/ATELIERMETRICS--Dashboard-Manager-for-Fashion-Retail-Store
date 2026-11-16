<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="java.util.List, java.text.NumberFormat, java.util.Locale, com.atelier.model.*, com.atelier.ml.RandomForestRegressor" %>
<%
  if (session.getAttribute("adminName") == null) {
    response.sendRedirect("login.jsp");
    return;
  }
  RandomForestRegressor rf = (RandomForestRegressor) request.getAttribute("rfModel");
  List<Product> products = (List<Product>) request.getAttribute("products");
  List<ProductForecast> forecasts = (List<ProductForecast>) request.getAttribute("forecasts");
  List<PriceRecommendation> recs = (List<PriceRecommendation>) request.getAttribute("recommendations");
  RandomForestRegressor.SimulationResult simResult = (RandomForestRegressor.SimulationResult) request.getAttribute("simResult");
  Product simProduct = (Product) request.getAttribute("simProduct");
  NumberFormat inr = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
  inr.setMaximumFractionDigits(0);
%>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AtelierMetrics — Java Random Forest ML &amp; Pricing</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">ATELIERMETRICS</div>
      <nav class="sidebar-nav">
        <a href="products" class="nav-link">Inventory &amp; SKUs</a>
        <a href="forecasts" class="nav-link active">ML Demand &amp; Pricing</a>
        <a href="products?action=new" class="nav-link">+ Add New SKU</a>
      </nav>
      <div class="sidebar-footer">
        <div>
          <div class="admin-name"><%= session.getAttribute("adminName") %></div>
          <div class="admin-role"><%= session.getAttribute("adminRole") %></div>
        </div>
        <a href="logout" class="logout-link">Sign Out</a>
      </div>
    </aside>

    <div class="main-wrap">
      <header class="topbar">
        <div>
          <span class="mono-muted">AW26 · JAVA ML ENGINE</span>
          <span class="slash">/</span>
          <span class="page-title">RANDOM FOREST DEMAND &amp; PRICE OPTIMIZATION</span>
        </div>
        <a href="products" class="btn-secondary">BACK TO INVENTORY</a>
      </header>

      <main class="content">
        <!-- ML Model Metrics + Retrain Form -->
        <section class="kpi-grid">
          <div class="kpi-card dark">
            <span class="kpi-label">VALIDATION R² SCORE</span>
            <strong class="kpi-value accent"><%= rf != null ? rf.getR2Score() : 0 %></strong>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">MAE / RMSE</span>
            <strong class="kpi-value">±<%= rf != null ? rf.getMae() : 0 %> <span class="mono-muted">UNITS</span></strong>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">RETRAIN RANDOM FOREST (POST)</span>
            <form method="post" action="forecasts" class="inline-retrain">
              <input type="hidden" name="action" value="retrain" />
              <input type="number" name="nEstimators" min="10" max="100" value="<%= rf != null ? rf.getNEstimators() : 40 %>" title="Trees" />
              <input type="number" name="maxDepth" min="3" max="14" value="<%= rf != null ? rf.getMaxDepth() : 8 %>" title="Depth" />
              <button type="submit" class="btn-primary">Train</button>
            </form>
          </div>
        </section>

        <!-- What-If Simulator -->
        <section class="panel-card">
          <div class="panel-header">
            <h2>WHAT-IF DEMAND &amp; PRICE ELASTICITY SIMULATOR (JAVA RANDOM FOREST)</h2>
          </div>
          <form method="post" action="forecasts" class="grid-form">
            <input type="hidden" name="action" value="simulate" />
            <label>
              <span>TARGET SKU</span>
              <select name="simProductId">
                <% if (products != null) {
                     for (Product p : products) { %>
                  <option value="<%= p.getId() %>" <%= (simProduct != null && simProduct.getId() == p.getId()) ? "selected" : "" %>>
                    <%= p.getSku() %> — <%= p.getName() %>
                  </option>
                <% } } %>
              </select>
            </label>
            <label>
              <span>TARGET MONTH (1–12)</span>
              <input type="number" name="simMonth" min="1" max="12" value="<%= request.getAttribute("simMonth") != null ? request.getAttribute("simMonth") : 12 %>" />
            </label>
            <label>
              <span>PROPOSED PRICE (₹)</span>
              <input type="number" name="simPrice" min="100" step="1" value="<%= request.getAttribute("simPrice") != null ? Math.round((Double) request.getAttribute("simPrice")) : 16500 %>" />
            </label>
            <label>
              <span>DISCOUNT (%)</span>
              <input type="number" name="simDiscount" min="0" max="60" value="<%= request.getAttribute("simDiscount") != null ? request.getAttribute("simDiscount") : 10 %>" />
            </label>
            <div class="form-actions span-2">
              <button type="submit" class="btn-primary">RUN DEMAND PREDICTION (POST)</button>
            </div>
          </form>

          <% if (simResult != null && simProduct != null) { %>
            <div class="sim-output">
              <div><span class="mono-muted">PREDICTED DEMAND</span><strong><%= simResult.predictedUnits %> units (<%= simResult.demandLiftPct >= 0 ? "+" : "" %><%= simResult.demandLiftPct %>%)</strong></div>
              <div><span class="mono-muted">PROJECTED REVENUE</span><strong><%= inr.format(simResult.projectedRevenue) %></strong></div>
              <div><span class="mono-muted">GROSS PROFIT</span><strong><%= inr.format(simResult.projectedGrossProfit) %> (<%= simResult.confidenceScore %>% conf.)</strong></div>
            </div>
          <% } %>
        </section>

        <!-- 90-Day Forecasts Table -->
        <section class="panel-card">
          <div class="panel-header">
            <h2>90-DAY DEMAND FORECAST &amp; STOCK RECOMMENDATIONS</h2>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Garment</th>
                  <th>Demand Tier</th>
                  <th>On Hand</th>
                  <th>M+1</th>
                  <th>M+2</th>
                  <th>M+3</th>
                  <th>Rec. Order</th>
                  <th>Stock Status</th>
                </tr>
              </thead>
              <tbody>
              <% if (forecasts != null) {
                   for (ProductForecast fc : forecasts) { %>
                <tr>
                  <td>
                    <div class="item-name"><%= fc.getName() %></div>
                    <div class="item-meta"><%= fc.getSku() %> · <%= fc.getCategory() %> · <%= fc.getSeason() %></div>
                  </td>
                  <td class="mono"><%= fc.getDemandTier() %></td>
                  <td class="mono"><%= fc.getCurrentStock() %></td>
                  <td class="mono"><strong><%= fc.getPredictedMonth1() %></strong></td>
                  <td class="mono"><%= fc.getPredictedMonth2() %></td>
                  <td class="mono"><%= fc.getPredictedMonth3() %></td>
                  <td class="mono"><%= fc.getRecommendedOrderQty() > 0 ? "+" + fc.getRecommendedOrderQty() : "—" %></td>
                  <td class="mono"><%= fc.getStockStatus() %></td>
                </tr>
              <% } } %>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Dynamic Pricing Recommendations -->
        <section class="panel-card">
          <div class="panel-header">
            <h2>PRICE &amp; MARKDOWN OPTIMIZATION (JDBC UPDATE)</h2>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Garment</th>
                  <th>Strategy</th>
                  <th>Current (₹)</th>
                  <th>Suggested (₹)</th>
                  <th>Rev. Impact</th>
                  <th>Apply</th>
                </tr>
              </thead>
              <tbody>
              <% if (recs != null) {
                   for (PriceRecommendation rec : recs) { %>
                <tr>
                  <td>
                    <div class="item-name"><%= rec.getName() %></div>
                    <div class="item-meta"><%= rec.getRationale() %></div>
                  </td>
                  <td class="mono"><%= rec.getActionType() %></td>
                  <td class="mono"><%= inr.format(rec.getCurrentEffectivePrice()) %> (<%= rec.getCurrentDiscountPct() %>%)</td>
                  <td class="mono"><strong><%= inr.format(rec.getSuggestedEffectivePrice()) %></strong> (<%= rec.getSuggestedDiscountPct() %>%)</td>
                  <td class="mono"><%= rec.getProjectedRevenueDelta() >= 0 ? "+" : "" %><%= inr.format(rec.getProjectedRevenueDelta()) %></td>
                  <td>
                    <% if (!"Hold Optimal".equals(rec.getActionType())) { %>
                      <form method="post" action="forecasts" class="inline-form">
                        <input type="hidden" name="action" value="applyPricing" />
                        <input type="hidden" name="productId" value="<%= rec.getProductId() %>" />
                        <input type="hidden" name="basePrice" value="<%= rec.getSuggestedPrice() %>" />
                        <input type="hidden" name="discountPct" value="<%= rec.getSuggestedDiscountPct() %>" />
                        <button type="submit" class="btn-sm">Apply</button>
                      </form>
                    <% } else { %>
                      <span class="mono-muted">Optimal</span>
                    <% } %>
                  </td>
                </tr>
              <% } } %>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  </div>
</body>
</html>

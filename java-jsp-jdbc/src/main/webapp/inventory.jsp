<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="java.util.List, java.text.NumberFormat, java.util.Locale, com.atelier.model.Product, com.atelier.model.InventoryLog" %>
<%
  if (session.getAttribute("adminName") == null) {
    response.sendRedirect("login.jsp");
    return;
  }
  List<Product> products = (List<Product>) request.getAttribute("products");
  List<InventoryLog> logs = (List<InventoryLog>) request.getAttribute("logs");
  String query = (String) request.getAttribute("query");
  String selectedCategory = (String) request.getAttribute("selectedCategory");
  NumberFormat inr = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
  inr.setMaximumFractionDigits(0);

  int totalUnits = 0;
  int lowStockCount = 0;
  if (products != null) {
    for (Product p : products) {
      totalUnits += p.getStockQty();
      if ("CRITICAL LOW".equals(p.getStockStatus()) || "LOW STOCK".equals(p.getStockStatus())) {
        lowStockCount++;
      }
    }
  }
%>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AtelierMetrics — Inventory Ledger (JSP + JDBC)</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">ATELIERMETRICS</div>
      <nav class="sidebar-nav">
        <a href="products" class="nav-link active">Inventory &amp; SKUs</a>
        <a href="forecasts" class="nav-link">ML Demand &amp; Pricing</a>
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
          <span class="mono-muted">AW26 · DROP 04</span>
          <span class="slash">/</span>
          <span class="page-title">INVENTORY MANAGEMENT LEDGER</span>
        </div>
        <a href="products?action=new" class="btn-primary">+ ADD PRODUCT</a>
      </header>

      <main class="content">
        <section class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">ACTIVE SKUS</span>
            <strong class="kpi-value"><%= products != null ? products.size() : 0 %></strong>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">TOTAL UNITS ON HAND</span>
            <strong class="kpi-value"><%= totalUnits %></strong>
          </div>
          <div class="kpi-card dark">
            <span class="kpi-label">LOW STOCK ALERTS</span>
            <strong class="kpi-value accent"><%= lowStockCount %> SKUS</strong>
          </div>
        </section>

        <!-- GET Filter Toolbar -->
        <form method="get" action="products" class="toolbar-card">
          <input type="text" name="q" value="<%= query != null ? query : "" %>" placeholder="Search SKU, garment, or colorway..." />
          <select name="category">
            <option value="All" <%= "All".equals(selectedCategory) ? "selected" : "" %>>All Categories</option>
            <option value="Outerwear" <%= "Outerwear".equals(selectedCategory) ? "selected" : "" %>>Outerwear</option>
            <option value="Knitwear" <%= "Knitwear".equals(selectedCategory) ? "selected" : "" %>>Knitwear</option>
            <option value="Dresses" <%= "Dresses".equals(selectedCategory) ? "selected" : "" %>>Dresses</option>
            <option value="Denim" <%= "Denim".equals(selectedCategory) ? "selected" : "" %>>Denim</option>
            <option value="Footwear" <%= "Footwear".equals(selectedCategory) ? "selected" : "" %>>Footwear</option>
            <option value="Accessories" <%= "Accessories".equals(selectedCategory) ? "selected" : "" %>>Accessories</option>
          </select>
          <button type="submit" class="btn-secondary">Filter (GET)</button>
        </form>

        <!-- Dynamic Inventory Table -->
        <section class="panel-card">
          <div class="panel-header">
            <h2>SKU INVENTORY &amp; STOCK STATUS</h2>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Garment</th>
                  <th>Category / Season</th>
                  <th>Retail (₹)</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions (POST / GET)</th>
                </tr>
              </thead>
              <tbody>
              <% if (products != null && !products.isEmpty()) {
                   for (Product p : products) {
                     String st = p.getStockStatus();
                     String stClass = "CRITICAL LOW".equals(st) ? "status-critical" :
                                      "LOW STOCK".equals(st) ? "status-warning" : "status-nominal";
              %>
                <tr>
                  <td class="mono"><%= p.getSku() %></td>
                  <td>
                    <div class="item-name"><%= p.getName() %></div>
                    <div class="item-meta"><%= p.getColor() %> · Size <%= p.getSize() %></div>
                  </td>
                  <td><%= p.getCategory() %> · <%= p.getSeason() %></td>
                  <td class="mono"><%= inr.format(p.getEffectivePrice()) %></td>
                  <td class="mono"><%= p.getStockQty() %> / <%= p.getReorderPoint() %></td>
                  <td><span class="<%= stClass %>"><%= st %></span></td>
                  <td class="actions-cell">
                    <a href="products?action=edit&id=<%= p.getId() %>" class="btn-sm">Edit</a>
                    <form method="post" action="products" class="inline-form">
                      <input type="hidden" name="action" value="restock" />
                      <input type="hidden" name="id" value="<%= p.getId() %>" />
                      <input type="hidden" name="delta" value="15" />
                      <button type="submit" class="btn-sm">+15 Stock</button>
                    </form>
                    <form method="post" action="products" class="inline-form">
                      <input type="hidden" name="action" value="sale" />
                      <input type="hidden" name="id" value="<%= p.getId() %>" />
                      <input type="hidden" name="quantity" value="1" />
                      <button type="submit" class="btn-sm">Sell 1</button>
                    </form>
                    <form method="post" action="products" class="inline-form" onsubmit="return confirm('Delete this SKU?');">
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value="<%= p.getId() %>" />
                      <button type="submit" class="btn-sm danger">Delete</button>
                    </form>
                  </td>
                </tr>
              <% } } else { %>
                <tr><td colspan="7" class="empty-row">No matching products found.</td></tr>
              <% } %>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Inventory Movement Audit Ledger -->
        <section class="panel-card">
          <div class="panel-header">
            <h2>RECENT STOCK MOVEMENT LEDGER (JDBC TRANSACTION AUDIT)</h2>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Garment</th>
                  <th>Delta</th>
                  <th>New Stock</th>
                  <th>Reason</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
              <% if (logs != null && !logs.isEmpty()) {
                   for (InventoryLog l : logs) { %>
                <tr>
                  <td class="mono"><%= l.getSku() %></td>
                  <td><%= l.getProductName() %></td>
                  <td class="mono"><%= l.getDelta() >= 0 ? "+" + l.getDelta() : l.getDelta() %></td>
                  <td class="mono"><%= l.getNewQty() %></td>
                  <td><%= l.getReason() %></td>
                  <td><%= l.getActor() %></td>
                </tr>
              <% } } else { %>
                <tr><td colspan="6" class="empty-row">No stock movements logged yet.</td></tr>
              <% } %>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  </div>
</body>
</html>

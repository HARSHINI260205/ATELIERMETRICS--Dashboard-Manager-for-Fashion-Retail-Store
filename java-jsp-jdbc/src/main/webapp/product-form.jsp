<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="com.atelier.model.Product" %>
<%
  if (session.getAttribute("adminName") == null) {
    response.sendRedirect("login.jsp");
    return;
  }
  Product p = (Product) request.getAttribute("editProduct");
  boolean isEdit = p != null;
%>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= isEdit ? "Edit SKU" : "Add Product" %> — AtelierMetrics</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div class="form-shell">
    <div class="form-card">
      <div class="panel-header">
        <h2><%= isEdit ? "EDIT SKU · " + p.getSku() : "ADD NEW STREETWEAR SKU" %></h2>
        <a href="products" class="btn-sm">Back to Ledger</a>
      </div>

      <form method="post" action="products" class="grid-form">
        <input type="hidden" name="action" value="<%= isEdit ? "update" : "create" %>" />
        <% if (isEdit) { %>
          <input type="hidden" name="id" value="<%= p.getId() %>" />
        <% } %>

        <label>
          <span>SKU CODE</span>
          <input type="text" name="sku" required value="<%= isEdit ? p.getSku() : "ATL-NW-105" %>" />
        </label>
        <label class="span-2">
          <span>GARMENT NAME</span>
          <input type="text" name="name" required value="<%= isEdit ? p.getName() : "" %>" placeholder="e.g., 3L Gore-Tex Technical Jacket" />
        </label>

        <label>
          <span>CATEGORY</span>
          <select name="category">
            <% String cat = isEdit ? p.getCategory() : "Outerwear"; %>
            <option value="Outerwear" <%= "Outerwear".equals(cat) ? "selected" : "" %>>Outerwear</option>
            <option value="Knitwear" <%= "Knitwear".equals(cat) ? "selected" : "" %>>Knitwear</option>
            <option value="Dresses" <%= "Dresses".equals(cat) ? "selected" : "" %>>Dresses</option>
            <option value="Denim" <%= "Denim".equals(cat) ? "selected" : "" %>>Denim</option>
            <option value="Footwear" <%= "Footwear".equals(cat) ? "selected" : "" %>>Footwear</option>
            <option value="Accessories" <%= "Accessories".equals(cat) ? "selected" : "" %>>Accessories</option>
          </select>
        </label>
        <label>
          <span>SEASON</span>
          <select name="season">
            <% String sea = isEdit ? p.getSeason() : "Winter"; %>
            <option value="Spring" <%= "Spring".equals(sea) ? "selected" : "" %>>Spring</option>
            <option value="Summer" <%= "Summer".equals(sea) ? "selected" : "" %>>Summer</option>
            <option value="Autumn" <%= "Autumn".equals(sea) ? "selected" : "" %>>Autumn</option>
            <option value="Winter" <%= "Winter".equals(sea) ? "selected" : "" %>>Winter</option>
            <option value="All-Season" <%= "All-Season".equals(sea) ? "selected" : "" %>>All-Season</option>
          </select>
        </label>
        <label>
          <span>SIZE</span>
          <input type="text" name="size" required value="<%= isEdit ? p.getSize() : "L" %>" />
        </label>

        <label>
          <span>COLORWAY</span>
          <input type="text" name="color" required value="<%= isEdit ? p.getColor() : "Obsidian Black" %>" />
        </label>
        <label>
          <span>COLOR HEX</span>
          <input type="text" name="colorHex" value="<%= isEdit && p.getColorHex() != null ? p.getColorHex() : "#111111" %>" />
        </label>
        <label>
          <span>DISCOUNT (%)</span>
          <input type="number" name="discountPct" min="0" max="75" value="<%= isEdit ? p.getDiscountPct() : 0 %>" />
        </label>

        <label>
          <span>COST PRICE (₹)</span>
          <input type="number" name="costPrice" min="1" step="1" required value="<%= isEdit ? (long) p.getCostPrice() : 5500 %>" />
        </label>
        <label>
          <span>BASE PRICE (₹)</span>
          <input type="number" name="basePrice" min="1" step="1" required value="<%= isEdit ? (long) p.getBasePrice() : 16500 %>" />
        </label>
        <label>
          <span>STOCK QTY</span>
          <input type="number" name="stockQty" min="0" required value="<%= isEdit ? p.getStockQty() : 25 %>" />
        </label>

        <label>
          <span>REORDER POINT</span>
          <input type="number" name="reorderPoint" min="1" required value="<%= isEdit ? p.getReorderPoint() : 20 %>" />
        </label>

        <div class="form-actions span-3">
          <a href="products" class="btn-secondary">Cancel</a>
          <button type="submit" class="btn-primary"><%= isEdit ? "SAVE CHANGES (POST)" : "CREATE SKU (POST)" %></button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>

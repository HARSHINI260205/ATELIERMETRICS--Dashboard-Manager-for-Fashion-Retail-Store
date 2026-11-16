package com.atelier.dao;

import com.atelier.model.InventoryLog;
import com.atelier.model.MonthlyHistory;
import com.atelier.model.Product;
import com.atelier.util.DBConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ProductDAO {

    public List<Product> getAllProducts(String keyword, String category) throws SQLException {
        List<Product> list = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT * FROM products WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (keyword != null && !keyword.trim().isEmpty()) {
            sql.append(" AND (name LIKE ? OR sku LIKE ? OR color LIKE ?)");
            String q = "%" + keyword.trim() + "%";
            params.add(q);
            params.add(q);
            params.add(q);
        }
        if (category != null && !category.trim().isEmpty() && !"All".equalsIgnoreCase(category)) {
            sql.append(" AND category = ?");
            params.add(category.trim());
        }
        sql.append(" ORDER BY id DESC");

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapProduct(rs));
                }
            }
        }
        return list;
    }

    public Product getById(int id) throws SQLException {
        String sql = "SELECT * FROM products WHERE id = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? mapProduct(rs) : null;
            }
        }
    }

    public void createProduct(Product p) throws SQLException {
        String sql = "INSERT INTO products (sku, name, category, size, color, color_hex, cost_price, base_price, discount_pct, stock_qty, reorder_point, season) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, p.getSku().trim().toUpperCase());
            ps.setString(2, p.getName().trim());
            ps.setString(3, p.getCategory());
            ps.setString(4, p.getSize());
            ps.setString(5, p.getColor());
            ps.setString(6, p.getColorHex() != null ? p.getColorHex() : "#111111");
            ps.setDouble(7, p.getCostPrice());
            ps.setDouble(8, p.getBasePrice());
            ps.setInt(9, p.getDiscountPct());
            ps.setInt(10, p.getStockQty());
            ps.setInt(11, p.getReorderPoint());
            ps.setString(12, p.getSeason());
            ps.executeUpdate();
        }
    }

    public void updateProduct(Product p) throws SQLException {
        String sql = "UPDATE products SET sku=?, name=?, category=?, size=?, color=?, color_hex=?, cost_price=?, base_price=?, discount_pct=?, stock_qty=?, reorder_point=?, season=? WHERE id=?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, p.getSku().trim().toUpperCase());
            ps.setString(2, p.getName().trim());
            ps.setString(3, p.getCategory());
            ps.setString(4, p.getSize());
            ps.setString(5, p.getColor());
            ps.setString(6, p.getColorHex() != null ? p.getColorHex() : "#111111");
            ps.setDouble(7, p.getCostPrice());
            ps.setDouble(8, p.getBasePrice());
            ps.setInt(9, p.getDiscountPct());
            ps.setInt(10, p.getStockQty());
            ps.setInt(11, p.getReorderPoint());
            ps.setString(12, p.getSeason());
            ps.setInt(13, p.getId());
            ps.executeUpdate();
        }
    }

    public void deleteProduct(int id) throws SQLException {
        String sql = "DELETE FROM products WHERE id = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    public void adjustStockWithAudit(int productId, int delta, String reason, String actor) throws SQLException {
        try (Connection conn = DBConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                Product p = null;
                try (PreparedStatement sel = conn.prepareStatement("SELECT * FROM products WHERE id = ? FOR UPDATE")) {
                    sel.setInt(1, productId);
                    try (ResultSet rs = sel.executeQuery()) {
                        if (rs.next()) p = mapProduct(rs);
                    }
                }
                if (p == null) throw new SQLException("Product not found.");

                int prevQty = p.getStockQty();
                int nextQty = Math.max(0, prevQty + delta);

                try (PreparedStatement upd = conn.prepareStatement("UPDATE products SET stock_qty = ? WHERE id = ?")) {
                    upd.setInt(1, nextQty);
                    upd.setInt(2, productId);
                    upd.executeUpdate();
                }

                try (PreparedStatement log = conn.prepareStatement(
                        "INSERT INTO inventory_logs (product_id, sku, product_name, delta, previous_qty, new_qty, reason, actor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
                    log.setInt(1, p.getId());
                    log.setString(2, p.getSku());
                    log.setString(3, p.getName());
                    log.setInt(4, delta);
                    log.setInt(5, prevQty);
                    log.setInt(6, nextQty);
                    log.setString(7, reason);
                    log.setString(8, actor);
                    log.executeUpdate();
                }
                conn.commit();
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            }
        }
    }

    public void recordSaleWithAudit(int productId, int qty, String channel, String actor) throws SQLException {
        try (Connection conn = DBConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                Product p = null;
                try (PreparedStatement sel = conn.prepareStatement("SELECT * FROM products WHERE id = ? FOR UPDATE")) {
                    sel.setInt(1, productId);
                    try (ResultSet rs = sel.executeQuery()) {
                        if (rs.next()) p = mapProduct(rs);
                    }
                }
                if (p == null) throw new SQLException("Product not found.");
                if (p.getStockQty() < qty) throw new SQLException("Insufficient stock available.");

                int prevQty = p.getStockQty();
                int nextQty = prevQty - qty;
                double unitPrice = p.getEffectivePrice();
                double totalAmount = unitPrice * qty;

                try (PreparedStatement upd = conn.prepareStatement("UPDATE products SET stock_qty = ? WHERE id = ?")) {
                    upd.setInt(1, nextQty);
                    upd.setInt(2, productId);
                    upd.executeUpdate();
                }

                try (PreparedStatement insSale = conn.prepareStatement(
                        "INSERT INTO sales (product_id, sku, product_name, quantity, unit_price, total_amount, channel) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
                    insSale.setInt(1, p.getId());
                    insSale.setString(2, p.getSku());
                    insSale.setString(3, p.getName());
                    insSale.setInt(4, qty);
                    insSale.setDouble(5, unitPrice);
                    insSale.setDouble(6, totalAmount);
                    insSale.setString(7, channel);
                    insSale.executeUpdate();
                }

                try (PreparedStatement log = conn.prepareStatement(
                        "INSERT INTO inventory_logs (product_id, sku, product_name, delta, previous_qty, new_qty, reason, actor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
                    log.setInt(1, p.getId());
                    log.setString(2, p.getSku());
                    log.setString(3, p.getName());
                    log.setInt(4, -qty);
                    log.setInt(5, prevQty);
                    log.setInt(6, nextQty);
                    log.setString(7, "POS Sale (" + channel + ")");
                    log.setString(8, actor);
                    log.executeUpdate();
                }

                conn.commit();
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            }
        }
    }

    public List<InventoryLog> getRecentLogs() throws SQLException {
        List<InventoryLog> logs = new ArrayList<>();
        String sql = "SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 20";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                InventoryLog l = new InventoryLog();
                l.setId(rs.getInt("id"));
                l.setProductId(rs.getInt("product_id"));
                l.setSku(rs.getString("sku"));
                l.setProductName(rs.getString("product_name"));
                l.setDelta(rs.getInt("delta"));
                l.setPreviousQty(rs.getInt("previous_qty"));
                l.setNewQty(rs.getInt("new_qty"));
                l.setReason(rs.getString("reason"));
                l.setActor(rs.getString("actor"));
                l.setCreatedAt(rs.getTimestamp("created_at"));
                logs.add(l);
            }
        }
        return logs;
    }

    public void applyPricing(int productId, double basePrice, int discountPct) throws SQLException {
        String sql = "UPDATE products SET base_price = ?, discount_pct = ? WHERE id = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setDouble(1, Math.max(1.0, basePrice));
            ps.setInt(2, Math.max(0, Math.min(75, discountPct)));
            ps.setInt(3, productId);
            ps.executeUpdate();
        }
    }

    public List<MonthlyHistory> getAllMonthlyHistory() throws SQLException {
        List<MonthlyHistory> list = new ArrayList<>();
        String sql = "SELECT * FROM monthly_history ORDER BY product_id, year_month_str";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                MonthlyHistory h = new MonthlyHistory();
                h.setId(rs.getInt("id"));
                h.setProductId(rs.getInt("product_id"));
                h.setYearMonth(rs.getString("year_month_str"));
                h.setMonth(rs.getInt("month_num"));
                h.setUnitsSold(rs.getInt("units_sold"));
                h.setAvgPrice(rs.getDouble("avg_price"));
                h.setDiscountPct(rs.getInt("discount_pct"));
                h.setRevenue(rs.getDouble("revenue"));
                list.add(h);
            }
        }
        return list;
    }

    public void seedMonthlyHistoryIfEmpty(List<Product> products) throws SQLException {
        if (products == null || products.isEmpty()) return;
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement cntPs = conn.prepareStatement("SELECT COUNT(*) FROM monthly_history");
             ResultSet rs = cntPs.executeQuery()) {
            if (rs.next() && rs.getInt(1) > 0) return;
        }

        String[] ymList = {
            "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04",
            "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"
        };
        int[] mList = { 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 };

        String insSql = "INSERT INTO monthly_history (product_id, year_month_str, month_num, units_sold, avg_price, discount_pct, revenue) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(insSql)) {
            conn.setAutoCommit(false);
            for (int pIdx = 0; pIdx < products.size(); pIdx++) {
                Product p = products.get(pIdx);
                int baseDemand = 24 + (pIdx % 5) * 7;
                for (int mIdx = 0; mIdx < ymList.length; mIdx++) {
                    int m = mList[mIdx];
                    double sMult = seasonMultiplier(p.getSeason(), m);
                    int disc = (m == 1 || m == 7) ? 15 : p.getDiscountPct();
                    double wave = Math.sin((pIdx + 1) * 1.7 + mIdx * 0.9) * 0.08;
                    int units = Math.max(6, (int) Math.round((baseDemand + 0.8 * mIdx) * sMult * (1 + disc * 0.015) * (1 + wave)));
                    double avgPrice = Math.round(p.getBasePrice() * (1.0 - disc / 100.0));
                    double revenue = units * avgPrice;

                    ps.setInt(1, p.getId());
                    ps.setString(2, ymList[mIdx]);
                    ps.setInt(3, m);
                    ps.setInt(4, units);
                    ps.setDouble(5, avgPrice);
                    ps.setInt(6, disc);
                    ps.setDouble(7, revenue);
                    ps.addBatch();
                }
            }
            ps.executeBatch();
            conn.commit();
        }
    }

    private double seasonMultiplier(String season, int month) {
        if ("All-Season".equalsIgnoreCase(season)) return (month == 11 || month == 12) ? 1.18 : 1.0;
        if ("Winter".equalsIgnoreCase(season)) return (month == 12 || month == 1 || month == 2) ? 1.48 : (month == 11 || month == 3) ? 1.15 : 0.62;
        if ("Autumn".equalsIgnoreCase(season)) return (month >= 9 && month <= 11) ? 1.48 : (month == 8 || month == 12) ? 1.15 : 0.65;
        if ("Spring".equalsIgnoreCase(season)) return (month >= 3 && month <= 5) ? 1.48 : (month == 2 || month == 6) ? 1.15 : 0.65;
        return (month >= 6 && month <= 8) ? 1.48 : (month == 5 || month == 9) ? 1.15 : 0.60;
    }

    private Product mapProduct(ResultSet rs) throws SQLException {
        Product p = new Product();
        p.setId(rs.getInt("id"));
        p.setSku(rs.getString("sku"));
        p.setName(rs.getString("name"));
        p.setCategory(rs.getString("category"));
        p.setSize(rs.getString("size"));
        p.setColor(rs.getString("color"));
        p.setColorHex(rs.getString("color_hex"));
        p.setCostPrice(rs.getDouble("cost_price"));
        p.setBasePrice(rs.getDouble("base_price"));
        p.setDiscountPct(rs.getInt("discount_pct"));
        p.setStockQty(rs.getInt("stock_qty"));
        p.setReorderPoint(rs.getInt("reorder_point"));
        p.setSeason(rs.getString("season"));
        return p;
    }
}

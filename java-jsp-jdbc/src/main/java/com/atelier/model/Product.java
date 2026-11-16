package com.atelier.model;

public class Product {
    private int id;
    private String sku;
    private String name;
    private String category;
    private String size;
    private String color;
    private String colorHex;
    private double costPrice;
    private double basePrice;
    private int discountPct;
    private int stockQty;
    private int reorderPoint;
    private String season;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getColorHex() { return colorHex; }
    public void setColorHex(String colorHex) { this.colorHex = colorHex; }

    public double getCostPrice() { return costPrice; }
    public void setCostPrice(double costPrice) { this.costPrice = costPrice; }

    public double getBasePrice() { return basePrice; }
    public void setBasePrice(double basePrice) { this.basePrice = basePrice; }

    public int getDiscountPct() { return discountPct; }
    public void setDiscountPct(int discountPct) { this.discountPct = discountPct; }

    public int getStockQty() { return stockQty; }
    public void setStockQty(int stockQty) { this.stockQty = stockQty; }

    public int getReorderPoint() { return reorderPoint; }
    public void setReorderPoint(int reorderPoint) { this.reorderPoint = reorderPoint; }

    public String getSeason() { return season; }
    public void setSeason(String season) { this.season = season; }

    public double getEffectivePrice() {
        return Math.round(basePrice * (1.0 - discountPct / 100.0));
    }

    public String getStockStatus() {
        if (stockQty <= Math.max(5, reorderPoint / 2)) return "CRITICAL LOW";
        if (stockQty <= reorderPoint) return "LOW STOCK";
        if (stockQty > reorderPoint * 3) return "OVERSTOCK";
        return "IN STOCK";
    }
}

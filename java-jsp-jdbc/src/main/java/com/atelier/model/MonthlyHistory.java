package com.atelier.model;

public class MonthlyHistory {
    private int id;
    private int productId;
    private String yearMonth;
    private int month;
    private int unitsSold;
    private double avgPrice;
    private int discountPct;
    private double revenue;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getProductId() { return productId; }
    public void setProductId(int productId) { this.productId = productId; }

    public String getYearMonth() { return yearMonth; }
    public void setYearMonth(String yearMonth) { this.yearMonth = yearMonth; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public int getUnitsSold() { return unitsSold; }
    public void setUnitsSold(int unitsSold) { this.unitsSold = unitsSold; }

    public double getAvgPrice() { return avgPrice; }
    public void setAvgPrice(double avgPrice) { this.avgPrice = avgPrice; }

    public int getDiscountPct() { return discountPct; }
    public void setDiscountPct(int discountPct) { this.discountPct = discountPct; }

    public double getRevenue() { return revenue; }
    public void setRevenue(double revenue) { this.revenue = revenue; }
}

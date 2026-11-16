package com.atelier.model;

public class ProductForecast {
    private int productId;
    private String sku;
    private String name;
    private String category;
    private String season;
    private int currentStock;
    private int reorderPoint;
    private int predictedMonth1;
    private int predictedMonth2;
    private int predictedMonth3;
    private int totalNextQuarter;
    private double demandChangePct;
    private String demandTier;
    private String stockStatus;
    private int recommendedOrderQty;
    private double confidenceScore;

    public int getProductId() { return productId; }
    public void setProductId(int productId) { this.productId = productId; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSeason() { return season; }
    public void setSeason(String season) { this.season = season; }

    public int getCurrentStock() { return currentStock; }
    public void setCurrentStock(int currentStock) { this.currentStock = currentStock; }

    public int getReorderPoint() { return reorderPoint; }
    public void setReorderPoint(int reorderPoint) { this.reorderPoint = reorderPoint; }

    public int getPredictedMonth1() { return predictedMonth1; }
    public void setPredictedMonth1(int predictedMonth1) { this.predictedMonth1 = predictedMonth1; }

    public int getPredictedMonth2() { return predictedMonth2; }
    public void setPredictedMonth2(int predictedMonth2) { this.predictedMonth2 = predictedMonth2; }

    public int getPredictedMonth3() { return predictedMonth3; }
    public void setPredictedMonth3(int predictedMonth3) { this.predictedMonth3 = predictedMonth3; }

    public int getTotalNextQuarter() { return totalNextQuarter; }
    public void setTotalNextQuarter(int totalNextQuarter) { this.totalNextQuarter = totalNextQuarter; }

    public double getDemandChangePct() { return demandChangePct; }
    public void setDemandChangePct(double demandChangePct) { this.demandChangePct = demandChangePct; }

    public String getDemandTier() { return demandTier; }
    public void setDemandTier(String demandTier) { this.demandTier = demandTier; }

    public String getStockStatus() { return stockStatus; }
    public void setStockStatus(String stockStatus) { this.stockStatus = stockStatus; }

    public int getRecommendedOrderQty() { return recommendedOrderQty; }
    public void setRecommendedOrderQty(int recommendedOrderQty) { this.recommendedOrderQty = recommendedOrderQty; }

    public double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(double confidenceScore) { this.confidenceScore = confidenceScore; }
}

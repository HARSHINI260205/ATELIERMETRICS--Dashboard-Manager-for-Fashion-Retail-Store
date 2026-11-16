package com.atelier.model;

public class PriceRecommendation {
    private int productId;
    private String sku;
    private String name;
    private String category;
    private double currentEffectivePrice;
    private int currentDiscountPct;
    private double suggestedPrice;
    private int suggestedDiscountPct;
    private double suggestedEffectivePrice;
    private int predictedCurrentDemand;
    private int predictedSuggestedDemand;
    private double projectedRevenueDelta;
    private String actionType;
    private String rationale;

    public int getProductId() { return productId; }
    public void setProductId(int productId) { this.productId = productId; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public double getCurrentEffectivePrice() { return currentEffectivePrice; }
    public void setCurrentEffectivePrice(double currentEffectivePrice) { this.currentEffectivePrice = currentEffectivePrice; }

    public int getCurrentDiscountPct() { return currentDiscountPct; }
    public void setCurrentDiscountPct(int currentDiscountPct) { this.currentDiscountPct = currentDiscountPct; }

    public double getSuggestedPrice() { return suggestedPrice; }
    public void setSuggestedPrice(double suggestedPrice) { this.suggestedPrice = suggestedPrice; }

    public int getSuggestedDiscountPct() { return suggestedDiscountPct; }
    public void setSuggestedDiscountPct(int suggestedDiscountPct) { this.suggestedDiscountPct = suggestedDiscountPct; }

    public double getSuggestedEffectivePrice() { return suggestedEffectivePrice; }
    public void setSuggestedEffectivePrice(double suggestedEffectivePrice) { this.suggestedEffectivePrice = suggestedEffectivePrice; }

    public int getPredictedCurrentDemand() { return predictedCurrentDemand; }
    public void setPredictedCurrentDemand(int predictedCurrentDemand) { this.predictedCurrentDemand = predictedCurrentDemand; }

    public int getPredictedSuggestedDemand() { return predictedSuggestedDemand; }
    public void setPredictedSuggestedDemand(int predictedSuggestedDemand) { this.predictedSuggestedDemand = predictedSuggestedDemand; }

    public double getProjectedRevenueDelta() { return projectedRevenueDelta; }
    public void setProjectedRevenueDelta(double projectedRevenueDelta) { this.projectedRevenueDelta = projectedRevenueDelta; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getRationale() { return rationale; }
    public void setRationale(String rationale) { this.rationale = rationale; }
}

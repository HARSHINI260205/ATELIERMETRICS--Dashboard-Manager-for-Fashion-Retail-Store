package com.atelier.model;

import java.sql.Timestamp;

public class InventoryLog {
    private int id;
    private int productId;
    private String sku;
    private String productName;
    private int delta;
    private int previousQty;
    private int newQty;
    private String reason;
    private String actor;
    private Timestamp createdAt;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getProductId() { return productId; }
    public void setProductId(int productId) { this.productId = productId; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public int getDelta() { return delta; }
    public void setDelta(int delta) { this.delta = delta; }

    public int getPreviousQty() { return previousQty; }
    public void setPreviousQty(int previousQty) { this.previousQty = previousQty; }

    public int getNewQty() { return newQty; }
    public void setNewQty(int newQty) { this.newQty = newQty; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}

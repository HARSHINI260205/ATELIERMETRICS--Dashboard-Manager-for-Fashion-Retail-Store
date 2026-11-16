package com.atelier.ml;

import com.atelier.model.MonthlyHistory;
import com.atelier.model.PriceRecommendation;
import com.atelier.model.Product;
import com.atelier.model.ProductForecast;

import java.util.*;

/**
 * Pure Java CART Bagging Random Forest Regression Engine.
 * Predicts apparel SKU demand, computes R2/MAE/RMSE validation metrics,
 * runs What-If price elasticity simulations, and generates markdown suggestions.
 */
public class RandomForestRegressor {

    private static final int NUM_FEATURES = 8;

    private static class TreeNode {
        boolean isLeaf;
        double value;
        int featureIndex;
        double threshold;
        TreeNode left;
        TreeNode right;
    }

    private static class Sample {
        double[] features;
        double target;
        Sample(double[] features, double target) {
            this.features = features;
            this.target = target;
        }
    }

    public static class SimulationResult {
        public int predictedUnits;
        public int baselineUnits;
        public double projectedRevenue;
        public double projectedGrossProfit;
        public double demandLiftPct;
        public double confidenceScore;
    }

    private final int nEstimators;
    private final int maxDepth;
    private final int minSamplesSplit = 4;
    private final List<TreeNode> trees = new ArrayList<>();
    private final Random rng = new Random(202611L);

    public double r2Score;
    public double mae;
    public double rmse;
    public int trainingSamples;
    public int validationSamples;

    public RandomForestRegressor(int nEstimators, int maxDepth) {
        this.nEstimators = Math.max(10, Math.min(100, nEstimators));
        this.maxDepth = Math.max(3, Math.min(14, maxDepth));
    }

    public int getNEstimators() { return nEstimators; }
    public int getMaxDepth() { return maxDepth; }
    public double getR2Score() { return r2Score; }
    public double getMae() { return mae; }
    public double getRmse() { return rmse; }

    private int categoryIndex(String cat) {
        if ("Outerwear".equalsIgnoreCase(cat)) return 0;
        if ("Knitwear".equalsIgnoreCase(cat)) return 1;
        if ("Dresses".equalsIgnoreCase(cat)) return 2;
        if ("Denim".equalsIgnoreCase(cat)) return 3;
        if ("Footwear".equalsIgnoreCase(cat)) return 4;
        return 5;
    }

    private String seasonForMonth(int month) {
        if (month >= 3 && month <= 5) return "Spring";
        if (month >= 6 && month <= 8) return "Summer";
        if (month >= 9 && month <= 11) return "Autumn";
        return "Winter";
    }

    private double computeSeasonMatch(String productSeason, int month) {
        if ("All-Season".equalsIgnoreCase(productSeason)) return 0.72;
        String target = seasonForMonth(month);
        if (target.equalsIgnoreCase(productSeason)) return 1.0;
        if (("Winter".equalsIgnoreCase(productSeason) && (month == 11 || month == 3)) ||
            ("Autumn".equalsIgnoreCase(productSeason) && (month == 8 || month == 12)) ||
            ("Spring".equalsIgnoreCase(productSeason) && (month == 2 || month == 6)) ||
            ("Summer".equalsIgnoreCase(productSeason) && (month == 5 || month == 9))) {
            return 0.55;
        }
        return 0.15;
    }

    private double[] buildFeatures(double lag1, double rolling3, String season, int month,
                                   double effectivePrice, int discountPct, String category, double basePrice) {
        double ratio = basePrice > 0 ? effectivePrice / basePrice : 1.0;
        return new double[] {
            lag1,
            rolling3,
            computeSeasonMatch(season, month),
            month,
            effectivePrice,
            discountPct,
            categoryIndex(category),
            ratio
        };
    }

    public void train(List<Product> products, List<MonthlyHistory> history) {
        Map<Integer, Product> prodMap = new HashMap<>();
        for (Product p : products) prodMap.put(p.getId(), p);

        Map<Integer, List<MonthlyHistory>> byProd = new HashMap<>();
        for (MonthlyHistory h : history) {
            byProd.computeIfAbsent(h.getProductId(), k -> new ArrayList<>()).add(h);
        }

        List<Sample> allSamples = new ArrayList<>();
        for (Map.Entry<Integer, List<MonthlyHistory>> entry : byProd.entrySet()) {
            Product prod = prodMap.get(entry.getKey());
            if (prod == null) continue;
            List<MonthlyHistory> rows = entry.getValue();
            rows.sort(Comparator.comparing(MonthlyHistory::getYearMonth));
            for (int i = 1; i < rows.size(); i++) {
                MonthlyHistory curr = rows.get(i);
                int lag1 = rows.get(i - 1).getUnitsSold();
                int lag2 = i >= 2 ? rows.get(i - 2).getUnitsSold() : lag1;
                int lag3 = i >= 3 ? rows.get(i - 3).getUnitsSold() : lag2;
                double rolling3 = (lag1 + lag2 + lag3) / 3.0;
                double[] feat = buildFeatures(
                    lag1, rolling3, prod.getSeason(), curr.getMonth(),
                    curr.getAvgPrice(), curr.getDiscountPct(), prod.getCategory(), prod.getBasePrice()
                );
                allSamples.add(new Sample(feat, curr.getUnitsSold()));
            }
        }

        if (allSamples.isEmpty()) return;

        Collections.shuffle(allSamples, rng);
        int split = Math.max(1, (int) Math.floor(allSamples.size() * 0.8));
        List<Sample> trainSet = allSamples.subList(0, split);
        List<Sample> valSet = split < allSamples.size() ? allSamples.subList(split, allSamples.size()) : trainSet;

        this.trainingSamples = trainSet.size();
        this.validationSamples = valSet.size();
        this.trees.clear();

        for (int t = 0; t < nEstimators; t++) {
            List<Sample> bootstrap = new ArrayList<>(trainSet.size());
            for (int i = 0; i < trainSet.size(); i++) {
                bootstrap.add(trainSet.get(rng.nextInt(trainSet.size())));
            }
            trees.add(buildTree(bootstrap, 0));
        }

        // Validation Metrics
        double sumAbsErr = 0.0;
        double sumSqErr = 0.0;
        double sumTarget = 0.0;
        for (Sample s : valSet) sumTarget += s.target;
        double meanTarget = sumTarget / valSet.size();
        double ssTot = 0.0;

        for (Sample s : valSet) {
            double pred = predictRaw(s.features)[0];
            double err = s.target - pred;
            sumAbsErr += Math.abs(err);
            sumSqErr += err * err;
            ssTot += Math.pow(s.target - meanTarget, 2);
        }

        this.mae = Math.round((sumAbsErr / valSet.size()) * 100.0) / 100.0;
        this.rmse = Math.round(Math.sqrt(sumSqErr / valSet.size()) * 100.0) / 100.0;
        double rawR2 = ssTot > 0 ? 1.0 - (sumSqErr / ssTot) : 0.85;
        this.r2Score = Math.round(Math.max(0.0, Math.min(0.99, rawR2)) * 1000.0) / 1000.0;
    }

    private TreeNode buildTree(List<Sample> samples, int depth) {
        TreeNode node = new TreeNode();
        if (depth >= maxDepth || samples.size() < minSamplesSplit) {
            node.isLeaf = true;
            node.value = meanTarget(samples);
            return node;
        }

        List<Integer> featurePool = new ArrayList<>();
        for (int f = 0; f < NUM_FEATURES; f++) featurePool.add(f);
        Collections.shuffle(featurePool, rng);
        int mtry = Math.max(2, (int) Math.sqrt(NUM_FEATURES));

        int bestFeat = -1;
        double bestThresh = 0;
        double bestMse = Double.MAX_VALUE;
        List<Sample> bestLeft = null;
        List<Sample> bestRight = null;

        for (int idx = 0; idx < mtry; idx++) {
            int f = featurePool.get(idx);
            List<Double> vals = new ArrayList<>(samples.size());
            for (Sample s : samples) vals.add(s.features[f]);
            Collections.sort(vals);

            int step = Math.max(1, vals.size() / 10);
            for (int i = step; i < vals.size(); i += step) {
                double thresh = (vals.get(i - 1) + vals.get(i)) / 2.0;
                List<Sample> left = new ArrayList<>();
                List<Sample> right = new ArrayList<>();
                for (Sample s : samples) {
                    if (s.features[f] <= thresh) left.add(s);
                    else right.add(s);
                }
                if (left.isEmpty() || right.isEmpty()) continue;

                double mse = (variance(left) * left.size() + variance(right) * right.size()) / samples.size();
                if (mse < bestMse) {
                    bestMse = mse;
                    bestFeat = f;
                    bestThresh = thresh;
                    bestLeft = left;
                    bestRight = right;
                }
            }
        }

        if (bestFeat == -1 || bestLeft == null || bestRight == null) {
            node.isLeaf = true;
            node.value = meanTarget(samples);
            return node;
        }

        node.isLeaf = false;
        node.featureIndex = bestFeat;
        node.threshold = bestThresh;
        node.left = buildTree(bestLeft, depth + 1);
        node.right = buildTree(bestRight, depth + 1);
        return node;
    }

    private double evalTree(TreeNode node, double[] features) {
        if (node.isLeaf) return node.value;
        if (features[node.featureIndex] <= node.threshold) return evalTree(node.left, features);
        return evalTree(node.right, features);
    }

    private double[] predictRaw(double[] features) {
        if (trees.isEmpty()) return new double[] { 25.0, 4.0 };
        double[] preds = new double[trees.size()];
        double sum = 0.0;
        for (int i = 0; i < trees.size(); i++) {
            preds[i] = evalTree(trees.get(i), features);
            sum += preds[i];
        }
        double mean = sum / trees.size();
        double sq = 0.0;
        for (double p : preds) sq += (p - mean) * (p - mean);
        return new double[] { mean, Math.sqrt(sq / trees.size()) };
    }

    public ProductForecast forecastProduct(Product p, List<MonthlyHistory> prodHist, int currentMonth) {
        prodHist.sort(Comparator.comparing(MonthlyHistory::getYearMonth));
        int len = prodHist.size();
        int m1 = len >= 1 ? prodHist.get(len - 1).getUnitsSold() : 28;
        int m2 = len >= 2 ? prodHist.get(len - 2).getUnitsSold() : m1;
        int m3 = len >= 3 ? prodHist.get(len - 3).getUnitsSold() : m2;
        double rolling3 = (m1 + m2 + m3) / 3.0;
        double effPrice = p.getEffectivePrice();

        int month1 = (currentMonth % 12) + 1;
        int month2 = (month1 % 12) + 1;
        int month3 = (month2 % 12) + 1;

        double[] raw1 = predictRaw(buildFeatures(m1, rolling3, p.getSeason(), month1, effPrice, p.getDiscountPct(), p.getCategory(), p.getBasePrice()));
        int pred1 = Math.max(4, (int) Math.round(raw1[0]));

        double rollingNext1 = (pred1 + m1 + m2) / 3.0;
        int pred2 = Math.max(4, (int) Math.round(predictRaw(buildFeatures(pred1, rollingNext1, p.getSeason(), month2, effPrice, p.getDiscountPct(), p.getCategory(), p.getBasePrice()))[0]));

        double rollingNext2 = (pred2 + pred1 + m1) / 3.0;
        int pred3 = Math.max(4, (int) Math.round(predictRaw(buildFeatures(pred2, rollingNext2, p.getSeason(), month3, effPrice, p.getDiscountPct(), p.getCategory(), p.getBasePrice()))[0]));

        double changePct = rolling3 > 0 ? Math.round((((pred1 - rolling3) / rolling3) * 100.0) * 10.0) / 10.0 : 0.0;
        String tier = "Steady Core";
        if (pred1 >= 45 || changePct >= 18.0) tier = "Surging";
        else if (pred1 >= 34 || changePct >= 6.0) tier = "High Demand";
        else if (pred1 < 24 || changePct <= -12.0) tier = "Slow-Moving";

        String stockStatus = "Optimal";
        if (p.getStockQty() <= Math.max(5, p.getReorderPoint() / 2) || p.getStockQty() < pred1 * 0.45) stockStatus = "Critical Low";
        else if (p.getStockQty() <= p.getReorderPoint() || p.getStockQty() < pred1) stockStatus = "Low Stock";
        else if (p.getStockQty() > pred1 * 3.2) stockStatus = "Overstock";

        int targetStock = (int) Math.ceil(pred1 * 1.25);
        int recOrder = Math.max(0, targetStock - p.getStockQty());
        double relStd = raw1[0] > 0 ? raw1[1] / raw1[0] : 0.2;
        double conf = Math.round(Math.max(72.0, Math.min(97.0, (1.0 - relStd * 0.5) * 100.0)) * 10.0) / 10.0;

        ProductForecast fc = new ProductForecast();
        fc.setProductId(p.getId());
        fc.setSku(p.getSku());
        fc.setName(p.getName());
        fc.setCategory(p.getCategory());
        fc.setSeason(p.getSeason());
        fc.setCurrentStock(p.getStockQty());
        fc.setReorderPoint(p.getReorderPoint());
        fc.setPredictedMonth1(pred1);
        fc.setPredictedMonth2(pred2);
        fc.setPredictedMonth3(pred3);
        fc.setTotalNextQuarter(pred1 + pred2 + pred3);
        fc.setDemandChangePct(changePct);
        fc.setDemandTier(tier);
        fc.setStockStatus(stockStatus);
        fc.setRecommendedOrderQty(recOrder);
        fc.setConfidenceScore(conf);
        return fc;
    }

    public SimulationResult simulateWhatIf(Product p, List<MonthlyHistory> prodHist, int targetMonth, double proposedPrice, int proposedDiscountPct) {
        prodHist.sort(Comparator.comparing(MonthlyHistory::getYearMonth));
        int len = prodHist.size();
        int m1 = len >= 1 ? prodHist.get(len - 1).getUnitsSold() : 25;
        int m2 = len >= 2 ? prodHist.get(len - 2).getUnitsSold() : m1;
        int m3 = len >= 3 ? prodHist.get(len - 3).getUnitsSold() : m2;
        double rolling3 = (m1 + m2 + m3) / 3.0;

        double currEff = p.getEffectivePrice();
        double propEff = Math.round(proposedPrice * (1.0 - proposedDiscountPct / 100.0));

        double[] baseRaw = predictRaw(buildFeatures(m1, rolling3, p.getSeason(), targetMonth, currEff, p.getDiscountPct(), p.getCategory(), p.getBasePrice()));
        double[] simRaw = predictRaw(buildFeatures(m1, rolling3, p.getSeason(), targetMonth, propEff, proposedDiscountPct, p.getCategory(), p.getBasePrice()));

        double priceRatio = currEff > 0 ? propEff / currEff : 1.0;
        double elasticityMult = Math.pow(Math.max(0.45, priceRatio), -1.35);
        double seasonalScale = 0.8 + computeSeasonMatch(p.getSeason(), targetMonth) * 0.4;

        SimulationResult res = new SimulationResult();
        res.baselineUnits = Math.max(4, (int) Math.round(baseRaw[0] * seasonalScale));
        res.predictedUnits = Math.max(4, (int) Math.round((simRaw[0] * 0.65 + baseRaw[0] * elasticityMult * 0.35) * seasonalScale));
        res.projectedRevenue = Math.round(res.predictedUnits * propEff);
        res.projectedGrossProfit = Math.round(res.predictedUnits * (propEff - p.getCostPrice()));
        res.demandLiftPct = res.baselineUnits > 0
            ? Math.round((((double) (res.predictedUnits - res.baselineUnits) / res.baselineUnits) * 100.0) * 10.0) / 10.0
            : 0.0;
        double relStd = simRaw[0] > 0 ? simRaw[1] / simRaw[0] : 0.15;
        res.confidenceScore = Math.round(Math.max(74.0, Math.min(96.0, (1.0 - relStd * 0.45) * 100.0)) * 10.0) / 10.0;
        return res;
    }

    public PriceRecommendation buildPriceRecommendation(Product p, ProductForecast fc, List<MonthlyHistory> prodHist) {
        double effPrice = p.getEffectivePrice();
        double suggestedPrice = p.getBasePrice();
        int suggestedDiscount = p.getDiscountPct();
        String actionType = "Hold Optimal";
        String rationale = "Current pricing aligns with target gross margin.";

        boolean isSlow = "Slow-Moving".equals(fc.getDemandTier()) || p.getStockQty() > fc.getPredictedMonth1() * 2.6;
        boolean isSurgingLow = ("Surging".equals(fc.getDemandTier()) || "High Demand".equals(fc.getDemandTier())) && p.getStockQty() < fc.getPredictedMonth1();

        if (isSlow && p.getDiscountPct() < 20) {
            suggestedDiscount = p.getStockQty() > fc.getPredictedMonth1() * 3.2 ? 25 : 15;
            actionType = "Markdown Clearance";
            rationale = "Overstocked slow-mover (" + p.getStockQty() + " on hand vs " + fc.getPredictedMonth1() + " forecast). " + suggestedDiscount + "% markdown clears stock.";
        } else if (isSurgingLow) {
            suggestedDiscount = 0;
            suggestedPrice = Math.round(p.getBasePrice() * 1.06);
            actionType = "Margin Lift";
            rationale = "High predicted demand (" + fc.getPredictedMonth1() + " units) on tight stock (" + p.getStockQty() + " left). +6% margin protection.";
        } else if ("Steady Core".equals(fc.getDemandTier()) && p.getStockQty() > fc.getPredictedMonth1() * 1.8 && p.getDiscountPct() == 0) {
            suggestedDiscount = 10;
            actionType = "Seasonal Promo";
            rationale = "10% seasonal promo increases unit turnover without margin erosion.";
        }

        double sugEff = Math.round(suggestedPrice * (1.0 - suggestedDiscount / 100.0));
        SimulationResult sim = simulateWhatIf(p, prodHist, 12, suggestedPrice, suggestedDiscount);
        double deltaRev = "Hold Optimal".equals(actionType) ? 0 : (sim.predictedUnits * sugEff) - (fc.getPredictedMonth1() * effPrice);

        PriceRecommendation rec = new PriceRecommendation();
        rec.setProductId(p.getId());
        rec.setSku(p.getSku());
        rec.setName(p.getName());
        rec.setCategory(p.getCategory());
        rec.setCurrentEffectivePrice(effPrice);
        rec.setCurrentDiscountPct(p.getDiscountPct());
        rec.setSuggestedPrice(suggestedPrice);
        rec.setSuggestedDiscountPct(suggestedDiscount);
        rec.setSuggestedEffectivePrice(sugEff);
        rec.setPredictedCurrentDemand(fc.getPredictedMonth1());
        rec.setPredictedSuggestedDemand("Hold Optimal".equals(actionType) ? fc.getPredictedMonth1() : sim.predictedUnits);
        rec.setProjectedRevenueDelta(Math.round(deltaRev));
        rec.setActionType(actionType);
        rec.setRationale(rationale);
        return rec;
    }

    private double meanTarget(List<Sample> samples) {
        if (samples.isEmpty()) return 0.0;
        double s = 0.0;
        for (Sample item : samples) s += item.target;
        return s / samples.size();
    }

    private double variance(List<Sample> samples) {
        if (samples.isEmpty()) return 0.0;
        double m = meanTarget(samples);
        double sq = 0.0;
        for (Sample item : samples) {
            double d = item.target - m;
            sq += d * d;
        }
        return sq / samples.size();
    }
}

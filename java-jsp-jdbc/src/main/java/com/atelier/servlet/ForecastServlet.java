package com.atelier.servlet;

import com.atelier.dao.ProductDAO;
import com.atelier.ml.RandomForestRegressor;
import com.atelier.model.MonthlyHistory;
import com.atelier.model.PriceRecommendation;
import com.atelier.model.Product;
import com.atelier.model.ProductForecast;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.SQLException;
import java.util.*;

@WebServlet("/forecasts")
public class ForecastServlet extends HttpServlet {
    private final ProductDAO dao = new ProductDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        if (req.getSession().getAttribute("adminName") == null) {
            resp.sendRedirect("login.jsp");
            return;
        }
        renderDashboard(req, resp, 40, 8, null, 0, 12, 0, 0);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        if (req.getSession().getAttribute("adminName") == null) {
            resp.sendRedirect("login.jsp");
            return;
        }

        String action = req.getParameter("action");
        int nEstimators = parseIntOrDefault(req.getParameter("nEstimators"), 40);
        int maxDepth = parseIntOrDefault(req.getParameter("maxDepth"), 8);

        try {
            if ("applyPricing".equals(action)) {
                int productId = Integer.parseInt(req.getParameter("productId"));
                double basePrice = Double.parseDouble(req.getParameter("basePrice"));
                int discountPct = Integer.parseInt(req.getParameter("discountPct"));
                dao.applyPricing(productId, basePrice, discountPct);
                resp.sendRedirect("forecasts");
                return;
            }

            if ("simulate".equals(action)) {
                int simProductId = Integer.parseInt(req.getParameter("simProductId"));
                int simMonth = Integer.parseInt(req.getParameter("simMonth"));
                double simPrice = Double.parseDouble(req.getParameter("simPrice"));
                int simDiscount = Integer.parseInt(req.getParameter("simDiscount"));
                renderDashboard(req, resp, nEstimators, maxDepth, "simulate", simProductId, simMonth, simPrice, simDiscount);
                return;
            }

            renderDashboard(req, resp, nEstimators, maxDepth, null, 0, 12, 0, 0);
        } catch (SQLException e) {
            throw new ServletException("Error running Java Random Forest operations", e);
        }
    }

    private void renderDashboard(HttpServletRequest req, HttpServletResponse resp,
                                 int nEstimators, int maxDepth, String mode,
                                 int simProductId, int simMonth, double simPrice, int simDiscount)
            throws ServletException, IOException {
        try {
            List<Product> products = dao.getAllProducts(null, null);
            dao.seedMonthlyHistoryIfEmpty(products);
            List<MonthlyHistory> history = dao.getAllMonthlyHistory();

            RandomForestRegressor rf = new RandomForestRegressor(nEstimators, maxDepth);
            rf.train(products, history);

            Map<Integer, List<MonthlyHistory>> histByProd = new HashMap<>();
            for (MonthlyHistory h : history) {
                histByProd.computeIfAbsent(h.getProductId(), k -> new ArrayList<>()).add(h);
            }

            List<ProductForecast> forecasts = new ArrayList<>();
            List<PriceRecommendation> recommendations = new ArrayList<>();
            for (Product p : products) {
                List<MonthlyHistory> pHist = histByProd.getOrDefault(p.getId(), new ArrayList<>());
                ProductForecast fc = rf.forecastProduct(p, pHist, 11);
                forecasts.add(fc);
                recommendations.add(rf.buildPriceRecommendation(p, fc, pHist));
            }

            if ("simulate".equals(mode) && simProductId > 0) {
                Product target = dao.getById(simProductId);
                if (target != null) {
                    List<MonthlyHistory> pHist = histByProd.getOrDefault(target.getId(), new ArrayList<>());
                    RandomForestRegressor.SimulationResult sim =
                        rf.simulateWhatIf(target, pHist, simMonth, simPrice, simDiscount);
                    req.setAttribute("simResult", sim);
                    req.setAttribute("simProduct", target);
                    req.setAttribute("simMonth", simMonth);
                    req.setAttribute("simPrice", simPrice);
                    req.setAttribute("simDiscount", simDiscount);
                }
            }

            req.setAttribute("products", products);
            req.setAttribute("forecasts", forecasts);
            req.setAttribute("recommendations", recommendations);
            req.setAttribute("rfModel", rf);
            req.getRequestDispatcher("forecasts.jsp").forward(req, resp);
        } catch (SQLException e) {
            throw new ServletException("Error loading ML forecast data via JDBC", e);
        }
    }

    private int parseIntOrDefault(String s, int def) {
        try {
            return s != null ? Integer.parseInt(s) : def;
        } catch (NumberFormatException e) {
            return def;
        }
    }
}

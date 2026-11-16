package com.atelier.servlet;

import com.atelier.dao.ProductDAO;
import com.atelier.model.Product;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;

@WebServlet("/products")
public class ProductServlet extends HttpServlet {
    private final ProductDAO dao = new ProductDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        if (req.getSession().getAttribute("adminName") == null) {
            resp.sendRedirect("login.jsp");
            return;
        }

        String action = req.getParameter("action");
        try {
            if ("new".equals(action)) {
                req.getRequestDispatcher("product-form.jsp").forward(req, resp);
                return;
            }
            if ("edit".equals(action)) {
                int id = Integer.parseInt(req.getParameter("id"));
                req.setAttribute("editProduct", dao.getById(id));
                req.getRequestDispatcher("product-form.jsp").forward(req, resp);
                return;
            }

            String q = req.getParameter("q");
            String category = req.getParameter("category");
            List<Product> products = dao.getAllProducts(q, category);

            req.setAttribute("products", products);
            req.setAttribute("logs", dao.getRecentLogs());
            req.setAttribute("query", q != null ? q : "");
            req.setAttribute("selectedCategory", category != null ? category : "All");
            req.getRequestDispatcher("inventory.jsp").forward(req, resp);
        } catch (SQLException e) {
            throw new ServletException("Error loading inventory via JDBC", e);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        Object adminObj = req.getSession().getAttribute("adminName");
        if (adminObj == null) {
            resp.sendRedirect("login.jsp");
            return;
        }
        String actor = adminObj.toString();
        String action = req.getParameter("action");

        try {
            if ("create".equals(action) || "update".equals(action)) {
                Product p = new Product();
                if ("update".equals(action)) {
                    p.setId(Integer.parseInt(req.getParameter("id")));
                }
                p.setSku(req.getParameter("sku"));
                p.setName(req.getParameter("name"));
                p.setCategory(req.getParameter("category"));
                p.setSize(req.getParameter("size"));
                p.setColor(req.getParameter("color"));
                p.setColorHex(req.getParameter("colorHex"));
                p.setCostPrice(Double.parseDouble(req.getParameter("costPrice")));
                p.setBasePrice(Double.parseDouble(req.getParameter("basePrice")));
                p.setDiscountPct(Integer.parseInt(req.getParameter("discountPct")));
                p.setStockQty(Integer.parseInt(req.getParameter("stockQty")));
                p.setReorderPoint(Integer.parseInt(req.getParameter("reorderPoint")));
                p.setSeason(req.getParameter("season"));

                if ("create".equals(action)) {
                    dao.createProduct(p);
                } else {
                    dao.updateProduct(p);
                }
            } else if ("restock".equals(action)) {
                int id = Integer.parseInt(req.getParameter("id"));
                int delta = Integer.parseInt(req.getParameter("delta"));
                dao.adjustStockWithAudit(id, delta, "Manual Replenishment Order", actor);
            } else if ("sale".equals(action)) {
                int id = Integer.parseInt(req.getParameter("id"));
                int qty = Integer.parseInt(req.getParameter("quantity"));
                dao.recordSaleWithAudit(id, qty, "Store POS", actor);
            } else if ("delete".equals(action)) {
                int id = Integer.parseInt(req.getParameter("id"));
                dao.deleteProduct(id);
            }

            resp.sendRedirect("products");
        } catch (SQLException e) {
            throw new ServletException("Error executing POST action: " + action, e);
        }
    }
}

# AtelierMetrics — Java Servlet, JSP, JDBC, MySQL & Pure Java ML

Complete **Java** web application for **Inventory Management & ML Demand Forecasting** (`HTML + CSS + JSP + Java Servlet + JDBC + MySQL + Pure Java Random Forest`).

## Contents
- `pom.xml` — Maven WAR configuration (Servlet API 4.0.1 + MySQL Connector/J 8.4.0).
- `sql/schema.sql` — MySQL schema (`admins`, `products`, `monthly_history`, `sales`, `inventory_logs`) and INR streetwear seed SKUs.
- `src/main/java/com/atelier/util/DBConnection.java` — JDBC MySQL connectivity.
- `src/main/java/com/atelier/model/` — `Product`, `InventoryLog`, `MonthlyHistory`, `ProductForecast`, `PriceRecommendation`.
- `src/main/java/com/atelier/dao/ProductDAO.java` — JDBC `PreparedStatement` CRUD, atomic stock/sale transactions, monthly history seeding, and dynamic pricing updates.
- `src/main/java/com/atelier/ml/RandomForestRegressor.java` — Pure Java CART Bagging Random Forest Regression engine (R²/MAE/RMSE validation, 90-day forecasts, What-If elasticity simulator, and price optimization).
- `src/main/java/com/atelier/servlet/` — `LoginServlet`, `LogoutServlet`, `ProductServlet`, `ForecastServlet` (`doGet` & `doPost`).
- `src/main/webapp/` — `login.jsp`, `inventory.jsp`, `product-form.jsp`, `forecasts.jsp`, `css/style.css`, `WEB-INF/web.xml`.

## How to Run in Eclipse / IntelliJ + Apache Tomcat 9
1. Execute `sql/schema.sql` in MySQL Workbench.
2. Import `java-jsp-jdbc` as an **Existing Maven Project** (or Dynamic Web Project targeting **Apache Tomcat 9** with `mysql-connector-j` in `WEB-INF/lib`). *(If using Tomcat 10+, replace `javax.servlet` with `jakarta.servlet`.)*
3. Update `DBConnection.java` with your MySQL username/password (or set `JDBC_URL`, `JDBC_USER`, `JDBC_PASSWORD` environment variables).
4. Deploy to Tomcat and open `http://localhost:8080/atelier-metrics-java/login.jsp`.
   - Login: `admin@ateliermetrics.com` / `FashionML@2026`.

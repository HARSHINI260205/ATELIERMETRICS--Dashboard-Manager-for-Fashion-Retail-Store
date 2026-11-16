<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AtelierMetrics — Inventory Login</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body class="login-body">
  <div class="login-split">
    <section class="login-hero">
      <div class="hero-top">
        <span class="brand-mark">ATELIERMETRICS</span>
        <span class="drop-code">AW26 · DROP 04</span>
      </div>
      <div class="hero-main">
        <p class="eyebrow">STREETWEAR INVENTORY OPERATIONS</p>
        <h1>STREETWEAR<br />INVENTORY<br />SYSTEMS.</h1>
        <p class="hero-copy">
          Centralized apparel stock tracking, POS deduction, and reorder alert management built on Java Servlet, JSP, JDBC, and MySQL.
        </p>
      </div>
      <div class="hero-stats">
        <div><strong>12 SKUS</strong><span>Core Archive</span></div>
        <div><strong>JDBC</strong><span>MySQL Persistence</span></div>
        <div><strong>MVC</strong><span>Servlet + JSP</span></div>
      </div>
    </section>

    <section class="login-panel">
      <div class="login-box">
        <p class="eyebrow">STORE OPERATIONS · PORTAL</p>
        <h2>ADMIN SIGN IN</h2>

        <% if (request.getAttribute("error") != null) { %>
          <div class="alert-box error"><%= request.getAttribute("error") %></div>
        <% } %>

        <form method="post" action="login" class="stack-form">
          <label>
            <span>ADMIN EMAIL</span>
            <input type="email" name="email" value="admin@ateliermetrics.com" required />
          </label>
          <label>
            <span>PASSWORD</span>
            <input type="password" name="password" value="FashionML@2026" required />
          </label>
          <button type="submit" class="btn-primary full-width">ENTER CONSOLE</button>
        </form>
      </div>
    </section>
  </div>
</body>
</html>

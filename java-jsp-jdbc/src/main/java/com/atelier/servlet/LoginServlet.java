package com.atelier.servlet;

import com.atelier.util.DBConnection;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

@WebServlet("/login")
public class LoginServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        req.getRequestDispatcher("login.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        String email = req.getParameter("email");
        String password = req.getParameter("password");

        String sql = "SELECT full_name, role FROM admins WHERE email = ? AND password = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email != null ? email.trim() : "");
            ps.setString(2, password != null ? password : "");

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    HttpSession session = req.getSession();
                    session.setAttribute("adminName", rs.getString("full_name"));
                    session.setAttribute("adminRole", rs.getString("role"));
                    resp.sendRedirect("products");
                } else {
                    req.setAttribute("error", "Invalid admin email or password.");
                    req.getRequestDispatcher("login.jsp").forward(req, resp);
                }
            }
        } catch (SQLException e) {
            throw new ServletException("Authentication database error", e);
        }
    }
}

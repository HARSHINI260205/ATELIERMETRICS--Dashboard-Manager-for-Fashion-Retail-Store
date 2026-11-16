package com.atelier.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {
    private static final String URL =
        System.getenv("JDBC_URL") != null
            ? System.getenv("JDBC_URL")
            : "jdbc:mysql://localhost:3306/atelier_inventory?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    private static final String USER =
        System.getenv("JDBC_USER") != null ? System.getenv("JDBC_USER") : "root";
    private static final String PASS =
        System.getenv("JDBC_PASSWORD") != null ? System.getenv("JDBC_PASSWORD") : "root";

    public static Connection getConnection() throws SQLException {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new SQLException("MySQL JDBC Driver (com.mysql.cj.jdbc.Driver) not found in classpath.", e);
        }
        return DriverManager.getConnection(URL, USER, PASS);
    }
}

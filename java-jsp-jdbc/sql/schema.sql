CREATE DATABASE IF NOT EXISTS atelier_inventory;
USE atelier_inventory;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(50) NOT NULL,
  size VARCHAR(20) NOT NULL,
  color VARCHAR(40) NOT NULL,
  color_hex VARCHAR(12) DEFAULT '#111111',
  cost_price DECIMAL(10,2) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  discount_pct INT DEFAULT 0,
  stock_qty INT NOT NULL DEFAULT 0,
  reorder_point INT NOT NULL DEFAULT 20,
  season VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  year_month_str VARCHAR(10) NOT NULL,
  month_num INT NOT NULL,
  units_sold INT NOT NULL,
  avg_price DECIMAL(10,2) NOT NULL,
  discount_pct INT NOT NULL DEFAULT 0,
  revenue DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  sku VARCHAR(30) NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  channel VARCHAR(40) NOT NULL,
  sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  sku VARCHAR(30) NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  delta INT NOT NULL,
  previous_qty INT NOT NULL,
  new_qty INT NOT NULL,
  reason VARCHAR(150) NOT NULL,
  actor VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO admins (email, password, full_name, role)
VALUES ('admin@ateliermetrics.com', 'FashionML@2026', 'Elena Vance', 'Merchandising Director')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT INTO products (sku, name, category, size, color, color_hex, cost_price, base_price, discount_pct, stock_qty, reorder_point, season)
VALUES
('ATL-OW-101', '3L Technical Shell Parka', 'Outerwear', 'L', 'Matte Charcoal', '#2B2D2F', 10800, 29990, 0, 14, 30, 'Winter'),
('ATL-KN-204', 'Distressed Heavyweight Boxy Hoodie', 'Knitwear', 'L', 'Washed Onyx', '#1F1F21', 6200, 18500, 5, 9, 28, 'Autumn'),
('ATL-DR-309', 'Asymmetric Nylon Parachute Dress', 'Dresses', 'S', 'Olive Drab', '#3B4437', 7800, 24500, 10, 42, 20, 'Spring'),
('ATL-DN-412', 'Wide-Leg Raw Selvedge Carpenter', 'Denim', '32', 'Deep Indigo', '#1E293B', 3900, 15800, 0, 68, 35, 'All-Season'),
('ATL-FW-503', 'Lug-Sole Leather Platform Derby', 'Footwear', '42', 'Obsidian Black', '#111111', 9500, 27500, 0, 18, 24, 'Autumn'),
('ATL-DR-318', 'Deconstructed Poplin Utility Dress', 'Dresses', 'M', 'Concrete Chalk', '#D6D4CD', 4600, 14900, 0, 96, 18, 'Summer'),
('ATL-OW-115', 'Cropped Ripstop MA-1 Flight Bomber', 'Outerwear', 'L', 'Sage Olive', '#4B5548', 6900, 20900, 0, 26, 22, 'Winter'),
('ATL-KN-219', 'Brushed Mohair Oversized Crewneck', 'Knitwear', 'M', 'Ash Heather', '#C8C6BF', 4900, 14990, 0, 84, 20, 'Spring'),
('ATL-AC-602', 'Ballistic Cordura Crossbody Sling', 'Accessories', 'One Size', 'Jet Black', '#1A1A1A', 5800, 19900, 0, 31, 25, 'All-Season'),
('ATL-DN-427', 'Double-Knee Overdyed Cargo Pant', 'Denim', '30', 'Stone Ecru', '#DCD8CC', 3750, 13900, 5, 78, 20, 'Summer'),
('ATL-FW-514', 'Technical Mesh Trail Runner', 'Footwear', '41', 'Concrete Grey', '#7C7D7A', 7500, 22500, 10, 11, 20, 'Spring'),
('ATL-AC-615', 'Ribbed Merino Short Watch Cap', 'Accessories', 'One Size', 'Signal Vermilion', '#E53E1D', 2450, 7990, 0, 12, 30, 'Winter')
ON DUPLICATE KEY UPDATE name = VALUES(name);

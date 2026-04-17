-- eStore Database Schema
-- MySQL Script for Shopping Cart Application

-- Create Database
CREATE DATABASE IF NOT EXISTS estore1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE estore1;

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS orderdetails;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS productimages;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pin VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Categories Table (Hierarchical categories)
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_category_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent_category (parent_category_id)
);

-- Products Table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    category_id INT NOT NULL,
    keywords TEXT,
    stock_quantity INT DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_category (category_id),
    INDEX idx_keywords (keywords(255)),
    INDEX idx_product_name (product_name),
    INDEX idx_sku (sku),
    INDEX idx_active (is_active)
);

-- Product Images Table (Multiple images per product)
CREATE TABLE productimages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    imageFiles VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_order (product_id, display_order),
    INDEX idx_product_id (product_id)
);

-- Orders Table
CREATE TABLE orders (
    orderId INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    userName VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pin VARCHAR(20) NOT NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    orderStatus ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    paymentStatus ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    orderDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_user (userId),
    INDEX idx_order_date (orderDate),
    INDEX idx_order_status (orderStatus)
);

-- Order Details Table (Products in each order)
CREATE TABLE orderdetails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    productId INT NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(orderId) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order (orderId),
    INDEX idx_product (productId),
    INDEX idx_order_product (orderId, productId)
);

-- Insert Sample Categories
INSERT INTO categories (name, description, parent_category_id) VALUES
('Electronics', 'Electronic devices and gadgets', NULL),
('Clothing', 'Fashion and apparel', NULL),
('Books', 'Books and educational materials', NULL),
('Home & Kitchen', 'Home appliances and kitchen items', NULL),
('Sports', 'Sports equipment and accessories', NULL);

-- Insert Subcategories
INSERT INTO categories (name, description, parent_category_id) VALUES
('Mobile Phones', 'Smartphones and mobile devices', 1),
('Laptops', 'Laptop computers and accessories', 1),
('Men\'s Clothing', 'Clothing for men', 2),
('Women\'s Clothing', 'Clothing for women', 2),
('Fiction', 'Fictional books and novels', 3),
('Non-Fiction', 'Non-fictional and educational books', 3),
('Kitchen Appliances', 'Kitchen tools and appliances', 4),
('Home Decor', 'Home decoration items', 4),
('Fitness', 'Fitness equipment and accessories', 5),
('Outdoor Sports', 'Outdoor sports gear', 5);

-- Insert Sample Products
INSERT INTO products (product_name, description, price, category_id, keywords, stock_quantity, sku) VALUES
('iPhone 15 Pro', 'Latest iPhone with advanced features', 999.99, 6, 'apple,iphone,smartphone,premium', 50, 'IP15PRO001'),
('Samsung Galaxy S24', 'Samsung flagship smartphone', 899.99, 6, 'samsung,galaxy,android,smartphone', 45, 'SGS24001'),
('MacBook Pro 16"', 'Professional laptop with M3 chip', 2499.99, 7, 'apple,macbook,laptop,professional', 30, 'MBP16001'),
('Dell XPS 15', 'High-performance Windows laptop', 1799.99, 7, 'dell,xps,laptop,windows', 25, 'DXP15001'),
('Men\'s T-Shirt', 'Comfortable cotton t-shirt', 29.99, 8, 'tshirt,mens,cotton,casual', 100, 'MTS001'),
('Women\'s Dress', 'Elegant evening dress', 89.99, 9, 'dress,womens,evening,elegant', 40, 'WDR001'),
('The Great Gatsby', 'Classic American novel', 15.99, 10, 'gatsby,novel,classic,american', 200, 'TGG001'),
('Sapiens', 'Brief history of humankind', 18.99, 11, 'sapiens,history,nonfiction,education', 150, 'SAP001'),
('Coffee Maker', 'Automatic coffee brewing machine', 79.99, 12, 'coffee,maker,kitchen,appliance', 60, 'CKM001'),
('Wall Art Set', 'Decorative wall art pieces', 49.99, 13, 'art,wall,decor,home', 80, 'WAS001'),
('Yoga Mat', 'Non-slip exercise mat', 25.99, 14, 'yoga,mat,exercise,fitness', 120, 'YGM001'),
('Tennis Racket', 'Professional tennis racket', 129.99, 15, 'tennis,racket,sports,professional', 35, 'TNR001');

-- Insert Sample Product Images
INSERT INTO productimages (product_id, imageFiles, display_order, is_primary) VALUES
(1, 'iphone15pro_front.jpg', 1, TRUE),
(1, 'iphone15pro_back.jpg', 2, FALSE),
(1, 'iphone15pro_side.jpg', 3, FALSE),
(2, 'galaxys24_front.jpg', 1, TRUE),
(2, 'galaxys24_back.jpg', 2, FALSE),
(3, 'macbookpro16_open.jpg', 1, TRUE),
(3, 'macbookpro16_closed.jpg', 2, FALSE),
(4, 'xps15_front.jpg', 1, TRUE),
(4, 'xps15_side.jpg', 2, FALSE),
(5, 'tshirt_blue_front.jpg', 1, TRUE),
(5, 'tshirt_blue_back.jpg', 2, FALSE),
(6, 'dress_black_front.jpg', 1, TRUE),
(6, 'dress_black_side.jpg', 2, FALSE),
(7, 'gatsby_book_cover.jpg', 1, TRUE),
(8, 'sapiens_book_cover.jpg', 1, TRUE),
(9, 'coffeemaker_front.jpg', 1, TRUE),
(9, 'coffeemaker_side.jpg', 2, FALSE),
(10, 'wallart_set.jpg', 1, TRUE),
(11, 'yogamat_rolled.jpg', 1, TRUE),
(11, 'yogamat_unrolled.jpg', 2, FALSE),
(12, 'tennis_racket_front.jpg', 1, TRUE),
(12, 'tennis_racket_side.jpg', 2, FALSE);

-- Create Views for Common Queries

-- View for Products with Images
CREATE VIEW products_with_images AS
SELECT 
    p.*,
    CONCAT('$', FORMAT(p.price, 2)) AS formatted_price,
    COALESCE(
        (SELECT
            JSON_ARRAYAGG(ordered_images.imageFiles)
        FROM
            (SELECT 
                pi.imageFiles
            FROM 
                productimages pi
            WHERE 
                pi.product_id = p.id
            ORDER BY 
                pi.display_order ASC
            ) AS ordered_images
        ),
        JSON_ARRAY()
    ) AS galleryImages
FROM products p
WHERE p.is_active = TRUE;

-- View for Orders with User Details
CREATE VIEW order_summary AS
SELECT 
    o.orderId,
    o.userName,
    o.address,
    o.city,
    o.state,
    o.pin,
    o.total,
    DATE_FORMAT(o.orderDate, '%m/%d/%Y') as orderDate,
    o.orderStatus,
    o.paymentStatus,
    u.email as userEmail
FROM orders o
JOIN users u ON o.userId = u.id;

-- Create Stored Procedures for Common Operations

-- Procedure to Get Products by Category
DELIMITER //
CREATE PROCEDURE GetProductsByCategory(IN category_id INT, IN search_keyword VARCHAR(255))
BEGIN
    SELECT 
        p.*,
        CONCAT('$', FORMAT(p.price, 2)) AS formatted_price,
        COALESCE(
            (SELECT
                JSON_ARRAYAGG(ordered_images.imageFiles)
            FROM
                (SELECT 
                    pi.imageFiles
                FROM 
                    productimages pi
                WHERE 
                    pi.product_id = p.id
                ORDER BY 
                    pi.display_order ASC
                ) AS ordered_images
            ),
            JSON_ARRAY()
        ) AS galleryImages
    FROM products p
    WHERE p.category_id = category_id 
    AND p.is_active = TRUE
    AND (search_keyword IS NULL OR p.keywords LIKE CONCAT('%', search_keyword, '%'))
    ORDER BY p.product_name;
END //
DELIMITER ;

-- Procedure to Get Order Details
DELIMITER //
CREATE PROCEDURE GetOrderDetails(IN order_id INT)
BEGIN
    SELECT 
        od.productId,
        p.product_name,
        p.product_img,
        od.qty,
        od.price,
        od.amount
    FROM orderdetails od
    JOIN products p ON od.productId = p.id
    WHERE od.orderId = order_id;
END //
DELIMITER ;

-- Create Triggers for Data Integrity

-- Trigger to update order total when order details change
DELIMITER //
CREATE TRIGGER update_order_total_after_insert
AFTER INSERT ON orderdetails
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET total = (
        SELECT SUM(amount) 
        FROM orderdetails 
        WHERE orderId = NEW.orderId
    )
    WHERE orderId = NEW.orderId;
END //
DELIMITER ;

-- Trigger to update order total when order details are updated
DELIMITER //
CREATE TRIGGER update_order_total_after_update
AFTER UPDATE ON orderdetails
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET total = (
        SELECT SUM(amount) 
        FROM orderdetails 
        WHERE orderId = NEW.orderId
    )
    WHERE orderId = NEW.orderId;
END //
DELIMITER ;

-- Trigger to update order total when order details are deleted
DELIMITER //
CREATE TRIGGER update_order_total_after_delete
AFTER DELETE ON orderdetails
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET total = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM orderdetails 
        WHERE orderId = OLD.orderId
    )
    WHERE orderId = OLD.orderId;
END //
DELIMITER ;

-- Create Indexes for Performance Optimization
CREATE INDEX idx_products_category_active ON products(category_id, is_active);
CREATE INDEX idx_orders_user_date ON orders(userId, orderDate);
CREATE INDEX idx_orderdetails_order_product ON orderdetails(orderId, productId);

-- Grant Permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON estore1.* TO 'estore_user'@'localhost' IDENTIFIED BY 'your_password';
-- FLUSH PRIVILEGES;

-- Display Setup Summary
SELECT 'Database setup completed successfully!' as status;
SELECT COUNT(*) as total_categories FROM categories;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_product_images FROM productimages;

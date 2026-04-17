-- eStore Database - Sample Data Insertion Script
-- Additional sample data for testing and development

USE estore1;

-- Insert Additional Users (for testing)
INSERT INTO users (email, firstName, lastName, address, city, state, pin, password) VALUES
('john.doe@email.com', 'John', 'Doe', '123 Main St', 'New York', 'NY', '10001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'), -- password: password123
('jane.smith@email.com', 'Jane', 'Smith', '456 Oak Ave', 'Los Angeles', 'CA', '90210', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('mike.wilson@email.com', 'Mike', 'Wilson', '789 Pine Rd', 'Chicago', 'IL', '60601', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('sarah.brown@email.com', 'Sarah', 'Brown', '321 Elm St', 'Houston', 'TX', '77001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert More Categories
INSERT INTO categories (name, description, parent_category_id) VALUES
('Tablets', 'Tablet computers and accessories', 1),
('Headphones', 'Audio headphones and earphones', 1),
('Smart Watches', 'Wearable smart devices', 1),
('Kids Clothing', 'Clothing for children', 2),
('Shoes', 'Footwear for all ages', 2),
('Accessories', 'Fashion accessories', 2),
('Science Fiction', 'Sci-fi books and novels', 3),
('Biography', 'Biographical books', 3),
('Cooking', 'Cookbooks and recipes', 3),
('Furniture', 'Home furniture items', 4),
('Cleaning Supplies', 'Home cleaning products', 4),
('Gaming', 'Video games and consoles', 5),
('Cycling', 'Bicycle and cycling gear', 5);

-- Insert More Products
INSERT INTO products (product_name, description, price, category_id, keywords, stock_quantity, sku) VALUES
('iPad Pro 12.9"', 'Professional tablet with M2 chip', 1099.99, 16, 'apple,ipad,tablet,professional', 35, 'IPADPRO001'),
('Samsung Galaxy Tab', 'Android tablet for productivity', 649.99, 16, 'samsung,tablet,android,galaxy', 40, 'SGTAB001'),
('AirPods Pro', 'Wireless earbuds with noise cancellation', 249.99, 17, 'apple,airpods,earbuds,wireless', 80, 'APP001'),
('Sony WH-1000XM5', 'Premium noise-cancelling headphones', 399.99, 17, 'sony,headphones,noise,cancelling', 45, 'SNYWH001'),
('Apple Watch Series 9', 'Smart watch with health features', 429.99, 18, 'apple,watch,smart,health', 60, 'AWS9001'),
('Samsung Galaxy Watch', 'Android smart watch', 299.99, 18, 'samsung,watch,smart,android', 55, 'SGW001'),
('Kids T-Shirt', 'Cotton t-shirt for children', 19.99, 19, 'tshirt,kids,cotton,comfortable', 120, 'KTS001'),
('Kids Jeans', 'Denim jeans for kids', 34.99, 19, 'jeans,kids,denim,durable', 80, 'KJN001'),
('Running Shoes', 'Athletic running shoes', 89.99, 20, 'shoes,running,athletic,sports', 90, 'RSH001'),
('Formal Shoes', 'Men\'s formal dress shoes', 129.99, 20, 'shoes,formal,men,dress', 50, 'FSH001'),
('Handbag', 'Women\'s leather handbag', 79.99, 21, 'handbag,women,leather,fashion', 70, 'HNB001'),
('Wallet', 'Men\'s leather wallet', 39.99, 21, 'wallet,men,leather,accessory', 100, 'WLT001'),
('Dune', 'Classic science fiction novel', 16.99, 22, 'dune,scifi,novel,classic', 150, 'DUN001'),
('1984', 'George Orwell dystopian novel', 14.99, 22, '1984,orwell,dystopian,novel', 180, 'EIT1984'),
('Steve Jobs Biography', 'Biography of Apple co-founder', 22.99, 23, 'steve,jobs,biography,apple', 90, 'SJB001'),
('Master Chef Cookbook', 'Professional cooking recipes', 29.99, 24, 'cookbook,recipes,cooking,professional', 110, 'MCC001'),
('Office Chair', 'Ergonomic office chair', 199.99, 25, 'chair,office,ergonomic,furniture', 30, 'OFC001'),
('Dining Table', 'Wooden dining table set', 599.99, 25, 'table,dining,wood,furniture', 15, 'DTB001'),
('All-Purpose Cleaner', 'Household cleaning spray', 8.99, 26, 'cleaner,household,spray,cleaning', 200, 'APC001'),
('Laundry Detergent', 'Liquid laundry detergent', 12.99, 26, 'detergent,laundry,liquid,cleaning', 150, 'LDR001'),
('PlayStation 5', 'Gaming console with controller', 499.99, 27, 'playstation,gaming,console,sony', 40, 'PS5001'),
('Xbox Series X', 'Microsoft gaming console', 499.99, 27, 'xbox,gaming,console,microsoft', 35, 'XSX001'),
('Mountain Bike', '21-speed mountain bike', 399.99, 28, 'bike,mountain,cycling,sports', 25, 'MTB001'),
('Road Bike', 'Professional road cycling bike', 899.99, 28, 'bike,road,cycling,professional', 20, 'RDB001');

-- Insert Additional Product Images
INSERT INTO productimages (product_id, imageFiles, display_order, is_primary) VALUES
(13, 'ipadpro_front.jpg', 1, TRUE),
(13, 'ipadpro_side.jpg', 2, FALSE),
(14, 'galaxytab_front.jpg', 1, TRUE),
(15, 'airpodspro_case.jpg', 1, TRUE),
(15, 'airpodspro_open.jpg', 2, FALSE),
(16, 'sony_headphones_folded.jpg', 1, TRUE),
(16, 'sony_headphones_open.jpg', 2, FALSE),
(17, 'applewatch_face.jpg', 1, TRUE),
(17, 'applewatch_side.jpg', 2, FALSE),
(18, 'galaxywatch_face.jpg', 1, TRUE),
(19, 'kids_tshirt_front.jpg', 1, TRUE),
(20, 'kids_jeans_front.jpg', 1, TRUE),
(21, 'runningshoes_side.jpg', 1, TRUE),
(21, 'runningshoes_top.jpg', 2, FALSE),
(22, 'formalshoes_front.jpg', 1, TRUE),
(23, 'handbag_front.jpg', 1, TRUE),
(23, 'handbag_open.jpg', 2, FALSE),
(24, 'wallet_front.jpg', 1, TRUE),
(24, 'wallet_open.jpg', 2, FALSE),
(25, 'dune_book_cover.jpg', 1, TRUE),
(26, '1984_book_cover.jpg', 1, TRUE),
(27, 'stevejobs_book_cover.jpg', 1, TRUE),
(28, 'chefbook_cover.jpg', 1, TRUE),
(29, 'officechair_front.jpg', 1, TRUE),
(29, 'officechair_side.jpg', 2, FALSE),
(30, 'diningtable_set.jpg', 1, TRUE),
(31, 'cleaner_spray.jpg', 1, TRUE),
(32, 'detergent_bottle.jpg', 1, TRUE),
(33, 'ps5_console.jpg', 1, TRUE),
(33, 'ps5_controller.jpg', 2, FALSE),
(34, 'xbox_console.jpg', 1, TRUE),
(34, 'xbox_controller.jpg', 2, FALSE),
(35, 'mountainbike_side.jpg', 1, TRUE),
(36, 'roadbike_side.jpg', 1, TRUE);

-- Insert Sample Orders
INSERT INTO orders (userId, userName, address, city, state, pin, total, orderStatus, paymentStatus) VALUES
(1, 'John Doe', '123 Main St', 'New York', 'NY', '10001', 1129.98, 'delivered', 'paid'),
(2, 'Jane Smith', '456 Oak Ave', 'Los Angeles', 'CA', '90210', 349.98, 'shipped', 'paid'),
(3, 'Mike Wilson', '789 Pine Rd', 'Chicago', 'IL', '60601', 899.99, 'processing', 'paid'),
(4, 'Sarah Brown', '321 Elm St', 'Houston', 'TX', '77001', 159.97, 'pending', 'pending');

-- Insert Sample Order Details
INSERT INTO orderdetails (orderId, productId, qty, price, amount) VALUES
-- Order 1: John's order (iPhone 15 Pro + AirPods Pro)
(1, 1, 1, 999.99, 999.99),
(1, 15, 1, 129.99, 129.99),

-- Order 2: Jane's order (Samsung Galaxy S24 + Samsung Galaxy Watch)
(2, 2, 1, 899.99, 899.99),
(2, 18, 1, 299.99, 299.99),

-- Order 3: Mike's order (MacBook Pro 16")
(3, 3, 1, 2499.99, 2499.99),

-- Order 4: Sarah's order (Women's Dress + Handbag + Wallet)
(4, 6, 1, 89.99, 89.99),
(4, 23, 1, 79.99, 79.99),
(4, 24, 1, 39.99, 39.99);

-- Update order totals (triggers should handle this automatically, but let's ensure accuracy)
UPDATE orders SET total = (
    SELECT SUM(amount) FROM orderdetails WHERE orderId = orders.orderId
);

-- Display Sample Data Summary
SELECT 'Sample data insertion completed!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_categories FROM categories;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_product_images FROM productimages;
SELECT COUNT(*) as total_orders FROM orders;
SELECT COUNT(*) as total_order_details FROM orderdetails;

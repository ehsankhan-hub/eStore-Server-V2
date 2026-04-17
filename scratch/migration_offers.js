const mysql = require('mysql2');
require('dotenv').config({ path: './.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "estore_user",
  password: process.env.DB_PASSWORD || "estore_password",
  database: process.env.DB_NAME || "estore1",
  port: process.env.DB_PORT || 3306,
}).promise();

async function createOffersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        offer_name VARCHAR(255),
        discount_pct INT DEFAULT 0,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log("Offers table created successfully with expires_at column");
  } catch (err) {
    console.error("Error creating offers table:", err);
  } finally {
    process.exit(0);
  }
}

createOffersTable();

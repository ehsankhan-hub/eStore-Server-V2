const mysql = require('mysql2');
require('dotenv').config({ path: './.env' }); // Adjusted path to current dir

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "estore_user",
  password: process.env.DB_PASSWORD || "estore_password",
  database: process.env.DB_NAME || "estore1",
  port: process.env.DB_PORT || 3306,
});

pool.query("DESCRIBE products", (err, results) => {
  if (err) {
    console.error("Error describing products:", err);
    process.exit(1);
  }
  console.log("Products table structure:", JSON.stringify(results, null, 2));
  
  pool.query("DESCRIBE productimages", (err, imgResults) => {
    if (err) {
      console.error("Error describing productimages:", err);
    } else {
      console.log("ProductImages table structure:", JSON.stringify(imgResults, null, 2));
    }
    process.exit(0);
  });
});

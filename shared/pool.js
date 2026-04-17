require('dotenv').config({ path: '../.env' });
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "estore1",
  port: process.env.DB_PORT || 3306,
  multipleStatements: true,
});

module.exports = pool;

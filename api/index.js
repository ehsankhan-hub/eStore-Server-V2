const express = require("express");
const path = require("path");
require('dotenv').config({ path: '../.env' });
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 5004;
const checkMaintenanceMode = require("../shared/maintenanceMode");

// Request Logger (Move to top)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Maintenance Gatekeeper
app.use("/api", checkMaintenanceMode);

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

// Global Error Handlers for Node
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Use the shared database connection
const pool = require("../shared/pool");

// ... (Rest of the routes remain the same)

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "eStore API is running!",
    timestamp: new Date().toISOString()
  });
});

// ... (Ensure routes are used)
const productCategories = require("../routes/productCategories");
const products = require("../routes/products");
const users = require("../routes/users");
const orders = require("../routes/orders");
const seller = require("../routes/seller");
const homepage = require("../routes/homepage");
const admin = require("../routes/admin");

app.use("/api/productCategories", productCategories);
app.use("/api/products", products);
app.use("/api/users", users);
app.use("/api/orders", orders);
app.use("/api/seller", seller);
app.use("/api/homepage", homepage);
app.use("/api/admin", admin);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 eStore API running on port ${PORT} (Listening on 0.0.0.0)`);
});

module.exports = app;

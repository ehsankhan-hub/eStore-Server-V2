const express = require("express");
const path = require("path");
require('dotenv').config({ path: '.env' });
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 5004;
const checkMaintenanceMode = require("./shared/maintenanceMode");

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
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// Global Error Handlers for Node
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Use the shared database connection
const pool = require("./shared/pool");

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "eStore API is running!",
    timestamp: new Date().toISOString()
  });
});

// Import your routes
const productCategories = require("./routes/productCategories");
const products = require("./routes/products");
const users = require("./routes/users");
const orders = require("./routes/orders");
const seller = require("./routes/seller");
const homepage = require("./routes/homepage");
const admin = require("./routes/admin");
const payments = require("./routes/payments");

app.use("/api/productCategories", productCategories);
app.use("/api/products", products);
app.use("/api/users", users);
app.use("/api/orders", orders);
app.use("/api/seller", seller);
app.use("/api/homepage", homepage);
app.use("/api/admin", admin);
app.use("/api/payments", payments);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log(`🚀 eStore API ACTIVE on ${PORT} (Root Path)`);
    console.log('=========================================');
    console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;

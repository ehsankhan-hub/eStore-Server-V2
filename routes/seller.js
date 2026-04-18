const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const pool = require("../shared/pool").promise();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST /api/seller/product
// @desc    Add a new product with images
router.post("/product", upload.array("images", 10), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { product_name, category_id, description, price, seller_id } = req.body;
    const stock_quantity = req.body.stock_quantity || 10;
    const sku = "SKU-" + Date.now();

    // 1. Insert into products table
    const [productResult] = await connection.query(
      `INSERT INTO products (product_name, category_id, description, price, seller_id, stock_quantity, sku) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product_name, category_id, description, price, seller_id || 1, stock_quantity, sku]
    );

    const productId = productResult.insertId;

    // 2. Insert into productimages table
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const isPrimary = i === 0 ? 1 : 0;
        await connection.query(
          `INSERT INTO productimages (product_id, imageFiles, display_order, is_primary) 
           VALUES (?, ?, ?, ?)`,
          [productId, file.filename, i, isPrimary]
        );
      }
    }
    
    // 3. Optional: Insert into offers table if discount was provided
    const { discount_pct, expires_at } = req.body;
    if (discount_pct && parseInt(discount_pct) > 0) {
      await connection.query(
        `INSERT INTO offers (productId, offer_name, discount_pct, expires_at) 
         VALUES (?, ?, ?, ?)`,
        [productId, "Introductory Offer", discount_pct, expires_at || null]
      );
    }

    await connection.commit();
    res.status(201).json({ 
        message: "Product created successfully", 
        productId: productId,
        files: req.files ? req.files.map(f => f.filename) : []
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product", details: error.message });
  } finally {
    connection.release();
  }
});

// @route   GET /api/seller/products/:sellerId
// @desc    Get products for a specific seller
router.get("/products/:sellerId", async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    
    // We use the view products_with_images if it exists, or a raw query
    const [rows] = await pool.query(
      `SELECT p.*, 
        JSON_ARRAYAGG(pi.imageFiles) as galleryImages,
        MAX(o.discount_pct) as discount_pct,
        MAX(o.expires_at) as expires_at
       FROM products p
       LEFT JOIN productimages pi ON p.id = pi.product_id
       LEFT JOIN offers o ON p.id = o.productId AND o.is_active = 1
       WHERE p.seller_id = ?
       GROUP BY p.id`,
      [sellerId]
    );

    // Parse galleryImages if it comes as a string (depends on MySQL version/driver)
    const processedRows = rows.map(row => {
        if (typeof row.galleryImages === 'string') {
            try {
                row.galleryImages = JSON.parse(row.galleryImages);
            } catch (e) {
                row.galleryImages = [];
            }
        }
        return row;
    });

    res.json(processedRows);
  } catch (error) {
    console.error("Error fetching seller products:", error);
    res.status(500).json({ error: "Failed to fetch products", details: error.message });
  }
});

// @route   POST /api/seller/offer
// @desc    Add a new offer to a product
router.post("/offer", async (req, res) => {
  try {
    const { productId, offer_name, discount_pct, expires_at } = req.body;
    
    // Deactivate existing active offers for this product first
    await pool.query(
      "UPDATE offers SET is_active = 0 WHERE productId = ? AND is_active = 1",
      [productId]
    );

    const [result] = await pool.query(
      `INSERT INTO offers (productId, offer_name, discount_pct, expires_at) 
       VALUES (?, ?, ?, ?)`,
      [productId, offer_name, discount_pct, expires_at || null]
    );

    res.status(201).json({ message: "Offer created successfully", offerId: result.insertId });
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ error: "Failed to create offer", details: error.message });
  }
});

// @route   GET /api/seller/offers/:sellerId
// @desc    Get all active offers for a seller
router.get("/offers/:sellerId", async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    const [rows] = await pool.query(
      `SELECT o.*, p.product_name, p.price as original_price
       FROM offers o
       JOIN products p ON o.productId = p.id
       WHERE p.seller_id = ?
       ORDER BY o.created_at DESC`,
      [sellerId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers", details: error.message });
  }
});

// @route   DELETE /api/seller/offer/:id
// @desc    Delete an offer
router.delete("/offer/:id", async (req, res) => {
  try {
    const offerId = req.params.id;
    await pool.query("DELETE FROM offers WHERE id = ?", [offerId]);
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ error: "Failed to delete offer", details: error.message });
  }
});

// @route   DELETE /api/seller/product/:id
// @desc    Delete a product and all its associations
router.delete("/product/:id", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const productId = req.params.id;

    // 1. Delete associated offers
    await connection.query("DELETE FROM offers WHERE productId = ?", [productId]);

    // 2. Delete associated images
    await connection.query("DELETE FROM productimages WHERE product_id = ?", [productId]);

    // 3. Delete from orderdetails (optional - depends on business logic, here we allow it)
    await connection.query("DELETE FROM orderdetails WHERE productId = ?", [productId]);

    // 4. Delete the product itself
    const [result] = await connection.query("DELETE FROM products WHERE id = ?", [productId]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    await connection.commit();
    res.json({ message: "Product and all associations deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting product:", error);
    
    // Provide a more specific error message based on common database errors
    let errorMessage = "Failed to delete product.";
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      errorMessage = "Cannot delete this product because it has been ordered by customers. Try deactivating it instead.";
    }
    
    res.status(500).json({ error: errorMessage, details: error.message });
  } finally {
    connection.release();
  }
});

// @route   PUT /api/seller/product/:id
// @desc    Update product details, images, and offers
router.put("/product/:id", upload.array("images", 10), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const productId = req.params.id;
    const { product_name, category_id, description, price, stock_quantity } = req.body;

    // 1. Update basic product info
    await connection.query(
      `UPDATE products 
       SET product_name = ?, category_id = ?, description = ?, price = ?, stock_quantity = ?
       WHERE id = ?`,
      [product_name || null, category_id || null, description || null, price || 0, stock_quantity || 0, productId]
    );

    // 2. Handle new images if provided (Append to existing)
    if (req.files && req.files.length > 0) {
      // Find current max display order for this product
      const [orderRes] = await connection.query(
        "SELECT MAX(display_order) as maxOrder FROM productimages WHERE product_id = ?",
        [productId]
      );
      let nextOrder = (orderRes[0]?.maxOrder || 0) + 1;

      for (const file of req.files) {
        await connection.query(
          `INSERT INTO productimages (product_id, imageFiles, display_order, is_primary) 
           VALUES (?, ?, ?, ?)`,
          [productId, file.filename, nextOrder++, 0]
        );
      }
    }

    // 3. Handle Offer update/creation
    const { discount_pct, expires_at } = req.body;
    if (discount_pct && parseInt(discount_pct) > 0) {
      // Check if active offer exists
      const [existingOffer] = await connection.query(
        "SELECT id FROM offers WHERE productId = ? AND is_active = 1 LIMIT 1",
        [productId]
      );

      if (existingOffer.length > 0) {
        await connection.query(
          "UPDATE offers SET discount_pct = ?, expires_at = ? WHERE id = ?",
          [discount_pct, expires_at || null, existingOffer[0].id]
        );
      } else {
        await connection.query(
          `INSERT INTO offers (productId, offer_name, discount_pct, expires_at) 
           VALUES (?, ?, ?, ?)`,
          [productId, "Update Offer", discount_pct, expires_at || null]
        );
      }
    }

    await connection.commit();
    res.json({ message: "Product and associated data updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating product:", error);
    res.status(500).json({ 
      error: "Failed to update product details.", 
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// @route   GET /api/seller/orders/:sellerId
// @desc    Get all orders containing products from this seller
router.get("/orders/:sellerId", async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    
    let query = `SELECT 
        od.orderId,
        o.orderDate,
        p.product_name,
        COALESCE(cat.name, 'General') as categoryName,
        od.qty as quantity,
        od.price as unit_price,
        od.amount as subtotal,
        o.orderStatus,
        o.userName as customerName
       FROM orderdetails od
       JOIN products p ON od.productId = p.id
       LEFT JOIN categories cat ON p.category_id = cat.id
       JOIN orders o ON od.orderId = o.orderId`;
    
    let params = [];
    if (sellerId !== 'all') {
      query += ` WHERE p.seller_id = ?`;
      params.push(sellerId);
    }
    
    query += ` ORDER BY o.orderDate DESC`;

    const [rows] = await pool.query(query, params);

    // Calculate summary statistics
    let totalSales = 0;
    rows.forEach(item => totalSales += parseFloat(item.subtotal || 0));
    const platformFee = totalSales * 0.10; // 10% example
    const readyForPayout = totalSales - platformFee;

    res.json({
      orders: rows,
      summary: {
        totalSales,
        platformFee,
        readyForPayout
      }
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    res.status(500).json({ error: "Failed to fetch orders", details: error.message });
  }
});

module.exports = router;

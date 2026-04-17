const express = require("express");
const pool = require("../shared/pool");
const orders = express.Router();
const checkToken = require("../shared/checkToken").checkToken;

orders.post("/add", checkToken, async (req, res) => {
  const {
    userName,
    userEmail,
    address,
    city,
    state,
    pin,
    total,
    shippingCost,
    orderDetails,
  } = req.body;

  try {
    // ... (userId fetch logic)
    const [users] = await pool
      .promise()
      .query("select id from users where email = ?", [userEmail]);

    if (users.length === 0) {
      return res.status(400).json({ message: "User does not exist." });
    }

    const userId = users[0].id;

    const connection = await pool.promise().getConnection();
    try {
      await connection.beginTransaction();

      //Insert order (Adding shipping_cost)
      const [orderResult] = await connection.query(
        `insert into orders (userId, userName, address, city, state, pin, total, shipping_cost) values (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, userName, address, city, state, pin, total, shippingCost || 0]
      );

      const orderId = orderResult.insertId;

      //Insert order details
      for (const item of orderDetails) {
        await connection.query(
          `insert into orderdetails (orderId, productId, qty, price, amount) values (?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.qty, item.price, item.amount]
        );

        // Deduct stock from products table
        console.log(`Deducting ${item.qty} from product ${item.productId}`);
        const [updateResult] = await connection.query(
          `update products set stock_quantity = stock_quantity - ? where id = ?`,
          [item.qty, item.productId]
        );
        console.log(`Update result for product ${item.productId}:`, updateResult.affectedRows, "rows affected");
      }

      await connection.commit();
      console.log(`Transaction committed for order ${orderId}`);
      res.status(201).json({ message: "Order placed successfully." });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.log("Order placement error: ", error);
    res.status(500).json({
      error: error.code || "INTERNAL_ERROR",
      message: error.message || "Something went wrong.",
    });
  }
});

orders.get("/allorders", checkToken, async (req, res) => {
  const { userEmail } = req.query;

  try {
    const [users] = await pool
      .promise()
      .query(`Select id from users where email = ?`, [userEmail]);

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const userId = users[0].id;

    const [ordersData] = await pool
      .promise()
      .query(
        `select orderId, DATE_FORMAT(orderDate, '%m/%d/%Y') as orderDate, userName, address, city, state, pin, total, shipping_cost, orderStatus from orders where userId = ?`,
        [userId]
      );

    const allOrders = ordersData.map((order) => ({
      orderId: order.orderId,
      userName: order.userName,
      address: order.address,
      city: order.city,
      state: order.state,
      pin: order.pin,
      total: order.total,
      shippingCost: order.shipping_cost,
      orderStatus: order.orderStatus,
      orderDate: order.orderDate,
    }));

    res.status(200).json(allOrders);
  } catch (error) {
    console.log("Error fetching orders: ", error);
    res.status(500).json({
      error: error.code || "INTERNAL_ERROR",
      message: error.message || "Something went wrong",
    });
  }
});

orders.get("/orderproducts", checkToken, async (req, res) => {
  const { orderId } = req.query;

  try {
    const [orderProducts] = await pool
      .promise()
      .query(
        `select 
            od.productId, 
            p.product_name as productName, 
            COALESCE((SELECT imageFiles FROM productimages WHERE product_id = p.id LIMIT 1), 'shop-1.jpg') as productImage,
            od.qty, 
            od.price, 
            od.amount 
         from orderdetails od 
         join products p on od.productId = p.id 
         where od.orderId = ?`,
        [orderId]
      );
    
    const orderDetailsList = orderProducts.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      qty: item.qty,
      price: item.price,
      amount: item.amount,
    }));

    res.status(200).json(orderDetailsList);
  } catch (error) {
    console.error("Error fetching order products:", error);
    res.status(500).json({
      error: error.code || "INTERNAL_ERROR",
      message: error.message || "Something went wrong.",
    });
  }
});

// TEMPORARY: Endpoint to clear orders for testing
orders.get("/clear-all", async (req, res) => {
  const { userEmail } = req.query;
  console.log('Clearing orders for email:', userEmail);
  try {
    const [users] = await pool
      .promise()
      .query(`Select id from users where email = ?`, [userEmail]);

    if (users.length === 0) {
      console.log('User not found:', userEmail);
      return res.status(404).json({ message: "User not found" });
    }

    const userId = users[0].id;
    const connection = await pool.promise().getConnection();
    try {
      await connection.beginTransaction();
      // Delete orderdetails first due to foreign key
      await connection.query(`delete from orderdetails where orderId in (select orderId from orders where userId = ?)`, [userId]);
      await connection.query(`delete from orders where userId = ?`, [userId]);
      await connection.commit();
      console.log('Successfully cleared orders for userId:', userId);
      res.status(200).json({ message: "Test orders cleared successfully." });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Clear orders error:', error);
    res.status(500).json({ message: "Failed to clear orders" });
  }
});

module.exports = orders;

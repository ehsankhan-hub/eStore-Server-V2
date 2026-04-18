const express = require("express");
const pool = require("../shared/pool");
const orders = express.Router();
const checkToken = require("../shared/checkToken");

orders.post("/add", checkToken, async (req, res) => {
  const {
    userName,
    userEmail,
    address,
    city,
    state,
    pin,
    total,
    orderDetails,
  } = req.body;

  try {
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
      console.log('Starting transaction for user:', userId);

      // 1. Insert order
      const [orderResult] = await connection.query(
        `insert into orders (userId, userName, address, city, state, pin, total) values (?, ?, ?, ?, ?, ?, ?)`,
        [userId, userName, address, city, state, pin, total]
      );

      const orderId = orderResult.insertId;
      console.log('Order created with ID:', orderId, 'Total items to insert:', orderDetails.length);

      for (const item of orderDetails) {
        console.log('Inserting item:', item.productId, 'Qty:', item.qty);
        await connection.query(
          `insert into orderdetails (orderId, product_id, quantity, unit_price, subtotal) values (?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.qty, item.price, item.amount]
        );
      }

      await connection.commit();
      console.log('Transaction committed successfully for order:', orderId);
      res.status(201).json({ message: "Order placed successfully.", orderId: orderId });

    } catch (err) {
      await connection.rollback();
      console.error('Transaction failed, rolled back:', err);
      throw err;
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
        `select orderId, DATE_FORMAT(orderDate, '%m/%d/%Y') as orderDate, userName, address, city, state, pin, total, orderStatus from orders where userId = ?`,
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
            od.product_id as productId, 
            p.product_name as productName, 
            COALESCE((SELECT imageFiles FROM productimages WHERE product_id = p.id LIMIT 1), 'shop-1.jpg') as productImage,
            od.quantity as qty, 
            od.unit_price as price, 
            od.subtotal as amount 
         from orderdetails od 
         join products p on od.product_id = p.id 
         where od.orderId = ?`,
        [orderId]
      );
    
    // Map the results (the query already uses the right aliases now)
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

module.exports = orders;


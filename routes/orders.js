const express = require("express");
const pool = require("../shared/pool");
const orders = express.Router();
const checkToken = require("../shared/checkToken").checkToken;
const { quoteCartFromDatabase } = require("../shared/cartPricing");

orders.post("/add", checkToken, async (req, res) => {
  const {
    userName,
    userEmail,
    address,
    city,
    state,
    pin,
    orderDetails,
  } = req.body;

  try {
    if (!userEmail || String(userEmail).toLowerCase() !== String(req.user.email).toLowerCase()) {
      return res.status(403).json({ message: "Email does not match signed-in user." });
    }

    if (!Array.isArray(orderDetails) || orderDetails.length === 0) {
      return res.status(400).json({ message: "Order must include at least one item." });
    }

    const lines = orderDetails.map((item) => ({
      productId: item.productId,
      qty: item.qty,
    }));

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

      const quote = await quoteCartFromDatabase(connection, lines, {
        forUpdate: true,
      });
      if (quote.error) {
        await connection.rollback();
        const status = quote.error === "OUT_OF_STOCK" ? 409 : 400;
        return res.status(status).json({
          error: quote.error,
          message: quote.message,
          productId: quote.productId,
          stock: quote.stock,
        });
      }

      const { items, subtotal, shipping, grandTotal } = quote;

      const [orderResult] = await connection.query(
        `insert into orders (userId, userName, address, city, state, pin, total, shipping_cost) values (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, userName, address, city, state, pin, grandTotal, shipping]
      );

      const orderId = orderResult.insertId;

      const sortedItems = [...items].sort((a, b) => a.productId - b.productId);

      for (const item of sortedItems) {
        const [upd] = await connection.query(
          `update products set stock_quantity = stock_quantity - ? where id = ? and stock_quantity >= ? and is_active = 1`,
          [item.qty, item.productId, item.qty]
        );
        if (upd.affectedRows !== 1) {
          await connection.rollback();
          return res.status(409).json({
            error: "OUT_OF_STOCK",
            message: "Insufficient stock at checkout.",
            productId: item.productId,
          });
        }

        await connection.query(
          `insert into orderdetails (orderId, productId, qty, price, amount) values (?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.qty, item.unitPrice, item.lineTotal]
        );
      }

      await connection.commit();
      res.status(201).json({
        message: "Order placed successfully.",
        orderId,
        subtotal,
        shipping,
        total: grandTotal,
      });
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

if (process.env.ALLOW_ORDER_TEST_CLEAR === "true") {
  orders.get("/clear-all", checkToken, async (req, res) => {
    const { userEmail } = req.query;
    if (
      String(req.user.email).toLowerCase() !== String(userEmail || "").toLowerCase()
    ) {
      return res.status(403).json({ message: "Can only clear orders for your own account." });
    }
    try {
      const [users] = await pool
        .promise()
        .query(`Select id from users where email = ?`, [userEmail]);

      if (users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const userId = users[0].id;
      const connection = await pool.promise().getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          `delete from orderdetails where orderId in (select orderId from orders where userId = ?)`,
          [userId]
        );
        await connection.query(`delete from orders where userId = ?`, [userId]);
        await connection.commit();
        res.status(200).json({ message: "Test orders cleared successfully." });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Clear orders error:", error);
      res.status(500).json({ message: "Failed to clear orders" });
    }
  });
}

module.exports = orders;

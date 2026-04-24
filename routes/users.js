const express = require("express");
const rateLimit = require("express-rate-limit");
const pool = require("../shared/pool");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { encryptPayoutPayload } = require("../shared/payoutCrypto");

const JWT_SECRET = process.env.JWT_SECRET || "estore-secret-key";

const user = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 40,
  standardHeaders: true,
  legacyHeaders: false,
});

user.post("/signup", authLimiter, async (req, res) => {
  const {
    firstName,
    lastName,
    address,
    city,
    state,
    pin,
    email,
    password,
    role,
    storeName,
    bankName,
    accountNumber,
    routingNumber,
  } = req.body;

  try {
    const [existingUser] = await pool
      .promise()
      .query("select count(*) as count from users where email = ?", [email]);
    if (existingUser[0].count > 0) {
      return res.status(409).send({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedRole = String(role || "buyer").toLowerCase();
    const allowedRoles = new Set(["buyer", "seller"]);
    const accountRole = allowedRoles.has(normalizedRole) ? normalizedRole : "buyer";

    let seller_store_name = null;
    let payout_bank_name = null;
    let payout_account_last4 = null;
    let payout_routing_last4 = null;
    let payout_sensitive_enc = null;
    let payout_verification_status = null;

    if (accountRole === "seller") {
      const store = String(storeName || "").trim();
      const bank = String(bankName || "").trim();
      const acctDigits = String(accountNumber || "").replace(/\D/g, "");
      const routeRaw = String(routingNumber || "").trim();

      if (!store || !bank || acctDigits.length < 4 || routeRaw.length < 4) {
        return res.status(400).send({
          message:
            "Seller registration requires store name, bank name, account number, and routing / SWIFT (min 4 characters each).",
        });
      }

      seller_store_name = store;
      payout_bank_name = bank;
      payout_account_last4 = acctDigits.slice(-4);
      payout_routing_last4 = routeRaw.slice(-4);
      payout_sensitive_enc = encryptPayoutPayload({
        accountNumber: acctDigits,
        routingNumber: routeRaw,
      });
      payout_verification_status = "pending";
    }

    await pool.promise().query(
      `insert into users (
        email, firstName, lastName, address, city, state, pin, password, role,
        seller_store_name, payout_bank_name, payout_account_last4, payout_routing_last4,
        payout_sensitive_enc, payout_verification_status
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        firstName,
        lastName,
        address,
        city,
        state,
        pin,
        hashedPassword,
        accountRole,
        seller_store_name,
        payout_bank_name,
        payout_account_last4,
        payout_routing_last4,
        payout_sensitive_enc,
        payout_verification_status,
      ]
    );

    res.status(201).send({ message: "Success" });
  } catch (error) {
    console.log("Signup Error: ", error);
    res.status(500).send({
      error: error.code || "INTERNAL_ERROR",
      message: error.message || "Something went wrong",
    });
  }
});

user.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool
      .promise()
      .query("select * from users where email = ?", [email]);

    if (users.length === 0) {
      return res.status(401).send({ message: "User does not exist." });
    }
    const foundUser = users[0];
    const passwordMatch = await bcrypt.compare(password, foundUser.password);

    if (!passwordMatch) {
      return res.status(401).send({ message: "Invalid password." });
    }

    const token = jwt.sign(
      { id: foundUser.id, email: foundUser.email, role: foundUser.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).send({
      token: token,
      expiresInSeconds: 3600,
      user: {
        id: foundUser.id,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        address: foundUser.address,
        city: foundUser.city,
        state: foundUser.state,
        pin: foundUser.pin,
        email: foundUser.email,
        role: foundUser.role,
        sellerStoreName: foundUser.seller_store_name || null,
        payoutVerificationStatus: foundUser.payout_verification_status || null,
        isStripeConnected: !!foundUser.is_stripe_connected,
      },
      message: "Login successful",
    });
  } catch (err) {
    console.log("Login Error: ", err);
    res.status(500).send({
      err: err.code || "INTERNAL_ERROR",
      message: err.message || "Something went wrong",
    });
  }
});

user.post("/social-login", authLimiter, async (req, res) => {
  const { email, firstName, lastName, provider, providerUid } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedProvider = String(provider || "").trim().toLowerCase();

  if (!normalizedEmail || !normalizedProvider || !providerUid) {
    return res
      .status(400)
      .send({ message: "email, provider and providerUid are required." });
  }

  try {
    const [users] = await pool
      .promise()
      .query("select * from users where email = ?", [normalizedEmail]);

    let foundUser = users[0];

    if (!foundUser) {
      const safeFirstName = String(firstName || "").trim() || "User";
      const safeLastName = String(lastName || "").trim() || "Social";
      const syntheticPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(syntheticPassword, 10);

      const [insertResult] = await pool.promise().query(
        `insert into users (
          email, firstName, lastName, address, city, state, pin, password, role
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedEmail,
          safeFirstName,
          safeLastName,
          "",
          "",
          "",
          "",
          hashedPassword,
          "buyer",
        ]
      );

      const [createdRows] = await pool
        .promise()
        .query("select * from users where id = ?", [insertResult.insertId]);
      foundUser = createdRows[0];
    }

    const token = jwt.sign(
      { id: foundUser.id, email: foundUser.email, role: foundUser.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).send({
      token,
      expiresInSeconds: 3600,
      user: {
        id: foundUser.id,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        address: foundUser.address,
        city: foundUser.city,
        state: foundUser.state,
        pin: foundUser.pin,
        email: foundUser.email,
        role: foundUser.role,
        sellerStoreName: foundUser.seller_store_name || null,
        payoutVerificationStatus: foundUser.payout_verification_status || null,
        isStripeConnected: !!foundUser.is_stripe_connected,
      },
      message: `Login successful via ${normalizedProvider}`,
    });
  } catch (err) {
    console.log("Social Login Error: ", err);
    res.status(500).send({
      err: err.code || "INTERNAL_ERROR",
      message: err.message || "Something went wrong",
    });
  }
});

user.get("/profile", async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }

  try {
    const [users] = await pool
      .promise()
      .query("select * from users where email = ?", [email]);

    if (users.length === 0) {
      return res.status(404).send({ message: "User not found" });
    }

    const foundUser = users[0];
    res.status(200).send({
      success: true,
      data: {
        personalInfo: {
          id: foundUser.id,
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          name: `${foundUser.firstName} ${foundUser.lastName}`,
          email: foundUser.email,
          phone: foundUser.phone || "",
          address: foundUser.address,
          city: foundUser.city,
          state: foundUser.state,
          pin: foundUser.pin,
          memberSince: foundUser.created_at || new Date().toISOString(),
        },
        shoppingStats: {
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          wishlistItems: 0,
          compareItems: 0,
        },
        recentOrders: [],
        accountStatus: {
          accountType: "Member",
          verificationStatus: "Verified",
          memberLevel: "Gold",
        },
      },
    });
  } catch (err) {
    console.log("Profile Error: ", err);
    res.status(500).send({
      err: err.code || "INTERNAL_ERROR",
      message: err.message || "Something went wrong",
    });
  }
});

module.exports = user;

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "estore-secret-key";

const checkToken = async (req, res, next) => {
  try {
    let token = req.headers?.authorization;
    if (!token) {
      return res.status(403).json({ message: "No token provided." });
    }
    if (typeof token === "string" && token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    console.log("JWT verification failed: ", error.message);
    res.status(401).json({ message: "Authorization failed!" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admin rights required." });
  }
};

module.exports = { checkToken, isAdmin };

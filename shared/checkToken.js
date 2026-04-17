const jwt = require("jsonwebtoken");

const checkToken = async (req, res, next) => {
  try {
    const token = req.headers?.authorization;

    if (!token) {
      return res.status(403).json({ message: "No token provided." });
    }

    const decoded = await jwt.verify(token, "estore-secret-key");
    req.user = decoded;

    next();
  } catch (error) {
    console.log("JWT verification failed: ", error.message);
    res.status(401).json({ message: "Authorization failed!" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admin rights required." });
  }
};

module.exports = { checkToken, isAdmin };


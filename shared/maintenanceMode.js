const pool = require("./pool");

const TTL_MS = Number(process.env.MAINTENANCE_CACHE_TTL_MS) || 5000;
let cache = { value: null, expiresAt: 0 };

const checkMaintenanceMode = async (req, res, next) => {
  try {
    if (req.path.startsWith("/admin")) {
      return next();
    }

    const now = Date.now();
    if (cache.value !== null && now < cache.expiresAt) {
      if (cache.value) {
        return res.status(503).json({
          maintenance: true,
          message: "Store is currently undergoing maintenance. Please check back soon!",
        });
      }
      return next();
    }

    const [rows] = await pool.promise().query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_MODE'"
    );

    const isMaintenance =
      rows.length > 0 &&
      (rows[0].setting_value === "true" ||
        rows[0].setting_value === "1" ||
        rows[0].setting_value === true);

    cache = { value: Boolean(isMaintenance), expiresAt: now + TTL_MS };

    if (isMaintenance) {
      return res.status(503).json({
        maintenance: true,
        message: "Store is currently undergoing maintenance. Please check back soon!",
      });
    }

    next();
  } catch (error) {
    console.error("Maintenance Check Error:", error);
    next();
  }
};

module.exports = checkMaintenanceMode;

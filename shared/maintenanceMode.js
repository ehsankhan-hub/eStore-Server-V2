const pool = require("./pool");

const checkMaintenanceMode = async (req, res, next) => {
    try {
        console.log(`[MaintenanceCheck] Checking path: ${req.path}`);
        // Skip check for Admin routes
        if (req.path.startsWith('/admin')) {
            return next();
        }

        const [rows] = await pool.promise().query(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_MODE'"
        );

        const isMaintenance = rows.length > 0 && 
            (rows[0].setting_value === 'true' || rows[0].setting_value === '1' || rows[0].setting_value === true);

        if (isMaintenance) {
            return res.status(503).json({ 
                maintenance: true, 
                message: "Store is currently undergoing maintenance. Please check back soon!" 
            });
        }

        next();
    } catch (error) {
        console.error('Maintenance Check Error:', error);
        next(); // Proceed if check fails to avoid blocking site due to DB error
    }
};

module.exports = checkMaintenanceMode;

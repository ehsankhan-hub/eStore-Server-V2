const express = require('express');
const router = express.Router();
const pool = require('../shared/pool');
const { checkToken, isAdmin } = require('../shared/checkToken');

// GET /api/admin/settings/public
// PUBLIC endpoint to check maintenance status
router.get("/settings/public", async (req, res) => {
    try {
        const [rows] = await pool.promise().query(
            "SELECT setting_key, setting_value FROM system_settings"
        );
        res.json(rows);
    } catch (error) {
        console.error('Public Settings Fetch Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Middleware to ensure all admin routes are protected
router.use(checkToken);
router.use(isAdmin);

/**
 * @route   GET /api/admin/stats
 * @desc    Get high-level platform statistics
 */
router.get('/stats', async (req, res) => {
    try {
        console.log('Fetching Admin Stats for User:', req.user.email);
        
        // Segregated user counts
        const [buyerRes] = await pool.promise().query("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
        const [sellerRes] = await pool.promise().query("SELECT COUNT(*) as count FROM users WHERE role = 'seller'");
        const [adminRes] = await pool.promise().query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        
        const buyers = buyerRes[0].count;
        const sellers = sellerRes[0].count;
        const admins = adminRes[0].count;

        // Growth: Users joined in last 30 days
        const [newUsersRes] = await pool.promise().query("SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL 30 DAY");
        const newUsers = newUsersRes[0].count;

        const [productRes] = await pool.promise().query("SELECT COUNT(*) as count FROM products WHERE is_active = 1");
        const [orderRes] = await pool.promise().query("SELECT COUNT(*) as count FROM orders");
        const [revenueRes] = await pool.promise().query("SELECT SUM(total) as total FROM orders WHERE paymentStatus = 'paid'");
        const [pendingRes] = await pool.promise().query("SELECT SUM(total) as total FROM orders WHERE paymentStatus = 'pending'");

        console.log(`Stats Found - Buyers: ${buyers}, Sellers: ${sellers}, Admins: ${admins}, Products: ${productRes[0].count}`);

        res.json({
            buyers: buyers,
            sellers: sellers,
            admins: admins,
            newUsers: newUsers,
            products: productRes[0].count,
            orders: orderRes[0].count,
            revenue: revenueRes[0].total || 0,
            pendingRevenue: pendingRes[0].total || 0
        });
    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @route   GET /api/admin/settings
 * @desc    Fetch all global system settings
 */
router.get('/settings', async (req, res) => {
    try {
        const [rows] = await pool.promise().query("SELECT * FROM system_settings");
        res.json(rows);
    } catch (error) {
        console.error('Fetch Settings Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @route   POST /api/admin/settings
 * @desc    Update a specific system setting
 */
router.post('/settings', async (req, res) => {
    const { setting_key, setting_value } = req.body;
    try {
        await pool.promise().query(
            "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?",
            [setting_value, setting_key]
        );
        res.json({ message: `Setting ${setting_key} updated` });
    } catch (error) {
        console.error('Update Setting Error:', error);
        res.status(500).json({ message: 'Failed to update setting' });
    }
});

/**
 * @route   POST /api/admin/homepage/blocks
 * @desc    Add or Update dynamic homepage blocks
 */
router.post('/homepage/blocks', async (req, res) => {
    const { id, block_type, title, link_text, link_url, link_params, items_payload, display_order, is_active } = req.body;

    try {
        if (id) {
            // Update existing block
            await pool.promise().query(
                `UPDATE homepage_blocks 
                 SET block_type = ?, title = ?, link_text = ?, link_url = ?, link_params = ?, items_payload = ?, display_order = ?, is_active = ?
                 WHERE id = ?`,
                [block_type, title, link_text, link_url, JSON.stringify(link_params), JSON.stringify(items_payload), display_order, is_active, id]
            );
            res.json({ message: 'Homepage block updated successfully' });
        } else {
            // Insert new block
            const [result] = await pool.promise().query(
                `INSERT INTO homepage_blocks (block_type, title, link_text, link_url, link_params, items_payload, display_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [block_type, title, link_text, link_url, JSON.stringify(link_params), JSON.stringify(items_payload), display_order]
            );
            res.json({ message: 'Homepage block created successfully', id: result.insertId });
        }
    } catch (error) {
        console.error('Homepage Admin Error:', error);
        res.status(500).json({ message: 'Failed to update homepage block' });
    }
});

/**
 * @route   DELETE /api/admin/homepage/blocks/:id
 * @desc    Deactivate or Delete a homepage block
 */
router.delete('/homepage/blocks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.promise().query("UPDATE homepage_blocks SET is_active = 0 WHERE id = ?", [id]);
        res.json({ message: 'Homepage block deactivated' });
    } catch (error) {
        console.error('Homepage Delete Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;

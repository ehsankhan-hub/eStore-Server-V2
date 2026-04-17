const express = require('express');
const router = express.Router();
const pool = require('../shared/pool');

// GET /api/homepage/public
// Fetch the dynamic homepage layouts
router.get('/public', (req, res) => {
    const query = `
        SELECT * FROM homepage_blocks 
        WHERE is_active = true 
        ORDER BY display_order ASC
    `;

    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching homepage blocks:', error);
            return res.status(500).json({ error: 'Database query failed' });
        }

        // Return the parsed blocks
        res.json(results);
    });
});

module.exports = router;

/**
 * Server-side cart totals from DB (prices + active offers + shipping rules).
 * Used by checkout and Stripe PaymentIntent so amounts are not client-trusted.
 */

async function loadShippingSettings(conn) {
  const [rows] = await conn.query(
    `SELECT setting_key, setting_value FROM system_settings
     WHERE setting_key IN (
       'SHIPPING_FREE_THRESHOLD','SHIPPING_BASE_RATE',
       'FREE_SHIPPING_THRESHOLD','DEFAULT_SHIPPING_COST'
     )`
  );
  const map = Object.fromEntries((rows || []).map((r) => [r.setting_key, r.setting_value]));
  const threshold = parseFloat(
    map.SHIPPING_FREE_THRESHOLD || map.FREE_SHIPPING_THRESHOLD || "500"
  );
  const baseRate = parseFloat(
    map.SHIPPING_BASE_RATE || map.DEFAULT_SHIPPING_COST || "25"
  );
  return {
    threshold: Number.isFinite(threshold) ? threshold : 500,
    baseRate: Number.isFinite(baseRate) ? baseRate : 25,
  };
}

function computeShipping(subtotal, { threshold, baseRate }) {
  if (subtotal <= 0) return 0;
  if (subtotal >= threshold) return 0;
  return Math.round(baseRate * 100) / 100;
}

function unitPriceFromRow(row) {
  const base = Number(row.price);
  const d = Number(row.discount_pct) || 0;
  if (!Number.isFinite(base)) return 0;
  if (d > 0) {
    return Math.round(base * (1 - d / 100) * 100) / 100;
  }
  return Math.round(base * 100) / 100;
}

/**
 * @param {*} conn mysql2 connection or pool (must have .query(sql, params))
 * @param {{ productId: number, qty: number }[]} lines
 * @param {{ forUpdate?: boolean }} [opts] use forUpdate inside a transaction before deducting stock
 */
async function quoteCartFromDatabase(conn, lines, opts = {}) {
  const forUpdate = Boolean(opts.forUpdate);
  const lockSql = forUpdate ? " FOR UPDATE" : "";
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "EMPTY_CART", message: "No line items." };
  }

  const sorted = [...lines].sort((a, b) => Number(a.productId) - Number(b.productId));
  const items = [];
  let subtotal = 0;

  for (const line of sorted) {
    const productId = Number(line.productId);
    const qty = parseInt(String(line.qty), 10);
    if (!Number.isFinite(productId) || productId < 1) {
      return { error: "BAD_PRODUCT", message: "Invalid product.", productId: line.productId };
    }
    if (!qty || qty < 1) {
      return { error: "BAD_QTY", message: "Invalid quantity.", productId };
    }

    const [rows] = await conn.query(
      `SELECT p.id, p.price, p.stock_quantity, p.is_active,
        COALESCE((
          SELECT MAX(o.discount_pct) FROM offers o
          WHERE o.productId = p.id AND o.is_active = 1
            AND (o.expires_at IS NULL OR DATE(o.expires_at) >= CURDATE())
        ), 0) AS discount_pct
       FROM products p WHERE p.id = ?${lockSql}`,
      [productId]
    );
    const row = rows && rows[0];
    if (!row || !row.is_active) {
      return { error: "NOT_FOUND", message: "Product not available.", productId };
    }
    if (Number(row.stock_quantity) < qty) {
      return {
        error: "OUT_OF_STOCK",
        message: "Insufficient stock.",
        productId,
        stock: Number(row.stock_quantity),
      };
    }

    const unitPrice = unitPriceFromRow(row);
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;
    subtotal += lineTotal;
    items.push({ productId, qty, unitPrice, lineTotal });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const shipSettings = await loadShippingSettings(conn);
  const shipping = computeShipping(subtotal, shipSettings);
  const grandTotal = Math.round((subtotal + shipping) * 100) / 100;

  return { items, subtotal, shipping, grandTotal };
}

module.exports = {
  quoteCartFromDatabase,
  loadShippingSettings,
  computeShipping,
  unitPriceFromRow,
};

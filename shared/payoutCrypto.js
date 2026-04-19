const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;

function getKey() {
  const env = process.env.PAYOUT_ENCRYPTION_KEY;
  if (env && String(env).length >= 32) {
    return crypto.createHash("sha256").update(String(env)).digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("PAYOUT_ENCRYPTION_KEY must be set (>= 32 chars) in production.");
  }
  return crypto.scryptSync("dev-payout-key-change-in-prod", "estore-payout-salt", KEY_LEN);
}

/**
 * @param {{ accountNumber: string, routingNumber: string }} payload
 * @returns {string} base64 blob for DB storage
 */
function encryptPayoutPayload(payload) {
  const iv = crypto.randomBytes(IV_LEN);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = JSON.stringify(payload);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64"),
  });
  return Buffer.from(packed).toString("base64");
}

module.exports = { encryptPayoutPayload };

/**
 * Generates a branded OneInfo shortcode.
 * Format: OI-XXXXXX  (e.g. OI-a3Kp9z)
 * The OI prefix makes every link identifiable as a OneInfo link.
 */
function generateShortCode(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "OI-" + code;
}

module.exports = generateShortCode;

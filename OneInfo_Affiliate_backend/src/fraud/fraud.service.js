const ClickEvent = require("../clicks/click.model");

/**
 * Basic Fraud Detection Service
 */
async function checkClickFraud({ shortCode, ip }) {

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // 1️⃣ Same IP clicking too many times in 5 minutes
  const ipClickCount = await ClickEvent.countDocuments({
    ip,
    createdAt: { $gte: fiveMinutesAgo },
  });

  if (ipClickCount > 20) {
    return {
      isFraud: true,
      reason: "Too many clicks from same IP",
    };
  }

  // 2️⃣ Same shortCode spike detection
  const shortCodeClicks = await ClickEvent.countDocuments({
    shortCode,
    createdAt: { $gte: fiveMinutesAgo },
  });

  if (shortCodeClicks > 200) {
    return {
      isFraud: true,
      reason: "Suspicious click spike",
    };
  }

  return {
    isFraud: false,
  };
}

module.exports = { checkClickFraud };

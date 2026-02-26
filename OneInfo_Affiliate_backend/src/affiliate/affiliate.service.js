const affiliateConfig = require("./affiliate.config");

function buildAffiliateUrl({ platform, baseUrl, creatorId, shortCode }) {
  const config = affiliateConfig[platform];

  if (!config || !config.paramMap) {
    return baseUrl; // safe fallback
  }

  try {
    const url = new URL(baseUrl);

    // Only set if mapping exists and value provided
    if (config.paramMap.subid && shortCode) {
      url.searchParams.set(config.paramMap.subid, shortCode);
    }

    if (config.paramMap.subid1 && creatorId) {
      url.searchParams.set(config.paramMap.subid1, creatorId.toString());
    }

    return url.toString();
  } catch (err) {
    return baseUrl; // safe fallback
  }
}

module.exports = { buildAffiliateUrl };

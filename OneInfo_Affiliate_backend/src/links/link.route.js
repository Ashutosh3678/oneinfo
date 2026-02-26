const express = require("express");
const router = express.Router();

const AffiliateLink = require("./affiliateLink.model");
const generateShortCode = require("../utils/shortCode");
const scrapeOG = require("../utils/scrapeOG");
const admitadService = require("../services/admitad.service");
const { buildAffiliateUrl } = require("../affiliate/affiliate.service");

// ─────────────────────────────────────────────
// Domain whitelist — only these are allowed to be shortened.
// Prevents abuse (phishing, random URL shortening, malware links).
// ─────────────────────────────────────────────
const ALLOWED_DOMAINS = [
  "lifestylestores.com",
  "myntra.com",
];

function isAllowedDomain(url) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// POST /links/create
// Protected by JWT (authMiddleware injected in server.js)
// ─────────────────────────────────────────────
router.post("/create", async (req, res) => {
  try {
    const { originalUrl } = req.body;
    const creatorId = req.creatorId;

    // ── Input validation ──────────────────────
    if (!originalUrl) {
      return res.status(400).json({ error: "originalUrl is required" });
    }

    if (!creatorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ── Domain whitelist check ─────────────────
    if (!isAllowedDomain(originalUrl)) {
      return res.status(400).json({
        error: `Unsupported domain. Only ${ALLOWED_DOMAINS.join(", ")} are allowed.`,
      });
    }

    // ── BASE_URL guard ────────────────────────
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      console.error("BASE_URL is not set in .env");
      return res.status(500).json({ error: "Server misconfiguration: BASE_URL missing" });
    }

    // ── Unique shortCode generation (max 5 attempts) ──
    let link = null;
    let attempts = 0;
    let shortCode;

    while (!link && attempts < 5) {
      attempts++;
      shortCode = generateShortCode(6);

      // Skip if code already taken
      const existing = await AffiliateLink.findOne({ shortCode }).lean();
      if (existing) continue;

      // ── Generate Admitad BASE_LINK (synchronous, no API call) ──
      let affiliateUrl;
      try {
        affiliateUrl = admitadService.generateBaseLink(originalUrl, shortCode);
      } catch (err) {
        console.error("BASE_LINK generation failed:", err.message);
        return res.status(500).json({
          error: "Failed to generate Admitad tracking link. " + err.message,
        });
      }

      // Inject additional params (subid, subid1, etc.) in a safe way
      const finalAffiliateUrl = buildAffiliateUrl({
        platform: "admitad",
        baseUrl: affiliateUrl,
        creatorId,
        shortCode,
      });

      // Strict: must contain Admitad tracking domain
      if (!finalAffiliateUrl || !finalAffiliateUrl.includes("tjzuh.com")) {
        console.error("Invalid affiliateUrl generated:", finalAffiliateUrl);
        return res.status(500).json({
          error: "Admitad tracking URL validation failed",
        });
      }

      // ── Scrape product metadata (non-critical, never blocks link creation) ──
      let productTitle = "";
      let productImage = "";
      try {
        const ogData = await scrapeOG(originalUrl);
        productTitle = ogData.productTitle || "";
        productImage = ogData.productImage || "";
      } catch (scrapeErr) {
        console.warn("OG scraping failed (non-fatal):", scrapeErr.message);
      }

      // ── Build publicUrl ────────────────────────────────────────────
      const publicUrl = `${baseUrl}/share/${shortCode}`;

      // ── Save to DB ─────────────────────────────────────────────────
      try {
        link = await AffiliateLink.create({
          shortCode,
          originalUrl,
          affiliateUrl: finalAffiliateUrl,
          publicUrl,
          creatorId,
          platform: "admitad",
          productTitle,
          productImage,
          clickCount: 0,
          isActive: true,
          expiresAt: null,
        });
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key race — retry
          link = null;
          continue;
        }
        throw err; // unexpected DB error — bubble up
      }
    }

    if (!link) {
      return res.status(500).json({
        error: "Could not generate a unique short code after 5 attempts. Please retry.",
      });
    }

    // ── Response ──────────────────────────────────────────────────────
    return res.status(201).json({
      message: "Link created successfully",
      shortCode: link.shortCode,
      platform: link.platform,
      productTitle: link.productTitle,
      productImage: link.productImage,
      oneInfoLink: link.publicUrl,   // e.g. http://localhost:4000/share/abc123
      affiliateUrl: link.affiliateUrl, // Admitad tracking URL (for debug only)
    });

  } catch (error) {
    console.error("Create link error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// POST /links/rescrape
// Re-fetches OG metadata for links that are missing images
// ─────────────────────────────────────────────
router.post("/rescrape", async (req, res) => {
  try {
    const creatorId = req.creatorId;
    if (!creatorId) return res.status(401).json({ error: "Unauthorized" });

    const links = await AffiliateLink.find({
      creatorId,
      $or: [
        { productImage: { $exists: false } },
        { productImage: "" },
        { productImage: null },
      ],
    }).lean();

    if (!links.length) {
      return res.json({ message: "All links already have images.", updated: 0 });
    }

    let updated = 0;
    const BATCH = 5;

    for (let i = 0; i < links.length; i += BATCH) {
      const batch = links.slice(i, i + BATCH);

      await Promise.all(
        batch.map(async (link) => {
          try {
            const ogData = await scrapeOG(link.originalUrl);
            if (ogData.productImage || ogData.productTitle) {
              await AffiliateLink.updateOne(
                { _id: link._id },
                {
                  $set: {
                    productImage: ogData.productImage || link.productImage || "",
                    productTitle: ogData.productTitle || link.productTitle || "",
                  },
                }
              );
              updated++;
            }
          } catch (e) {
            console.warn("Rescrape failed for", link.shortCode, e.message);
          }
        })
      );
    }

    return res.json({
      message: `Rescrape complete. Updated ${updated} of ${links.length} links.`,
      updated,
      total: links.length,
    });

  } catch (error) {
    console.error("Rescrape error:", error);
    return res.status(500).json({ error: "Server error during rescrape" });
  }
});

module.exports = router;
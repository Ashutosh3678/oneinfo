const express = require("express");
const router = express.Router();

const AffiliateLink = require("../links/affiliateLink.model");
const ClickEvent = require("../clicks/click.model");
const CreatorStats = require("../models/creatorStats.model");
const LinkStats = require("../models/linkStats.model");
const { checkClickFraud } = require("../fraud/fraud.service");
const logger = require("../utils/logger");

// ─────────────────────────────────────────────
// GET /share/:shortCode
// PUBLIC — no auth required
// Click tracking + strict 302 redirect to Admitad affiliate URL
//
// Rules:
//   1. No fallback to originalUrl — ever
//   2. isActive=false  → 404
//   3. expiresAt past  → 410 Gone
//   4. affiliateUrl missing/invalid → 404
//   5. Tracking is fire-and-forget (never blocks the user redirect)
// ─────────────────────────────────────────────
router.get("/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;

    // 1. Find the link
    const link = await AffiliateLink.findOne({ shortCode }).lean();

    if (!link) {
      return res.status(404).send("Link not found or expired.");
    }

    // 2. Check if link is active (admin disable support)
    if (!link.isActive) {
      return res.status(404).send("This link has been disabled.");
    }

    // 3. Check expiry (future-ready for paid campaigns / limited offers)
    if (link.expiresAt && link.expiresAt < new Date()) {
      return res.status(410).send("This link has expired.");
    }

    // 4. affiliateUrl is mandatory — NEVER fall back to originalUrl
    if (!link.affiliateUrl || !link.affiliateUrl.startsWith("http")) {
      logger.error("Redirect blocked: invalid affiliateUrl", { shortCode });
      return res.status(404).send("Tracking link unavailable.");
    }

    // 5. Fire-and-forget click tracking (non-blocking)
    trackClick({
      link,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      referer: req.headers["referer"] || req.headers["referrer"] || "direct",
    });

    // 6. Strict 302 redirect → Admitad tracking URL
    return res.redirect(302, link.affiliateUrl);

  } catch (error) {
    logger.error("Redirect error", { message: error.message });
    return res.status(500).send("Something went wrong. Please try again.");
  }
});

// ─────────────────────────────────────────────
// Fire-and-forget click tracking
// Increments clickCount on AffiliateLink AND per-creator/per-link stats
// Logs referrer for analytics
// ─────────────────────────────────────────────
async function trackClick({ link, ip, userAgent, referer }) {
  try {
    const fraudResult = await checkClickFraud({ shortCode: link.shortCode, ip });

    // Always log the raw click event (fraud or not)
    await ClickEvent.create({
      shortCode:   link.shortCode,
      creatorId:   link.creatorId,
      ip,
      userAgent:   userAgent || "unknown",
      referer:     referer || "direct",
      isFraud:     fraudResult.isFraud,
      fraudReason: fraudResult.reason || null,
      timestamp:   new Date(),
    });

    // Only increment stats for non-fraudulent clicks
    if (!fraudResult.isFraud) {
      await Promise.all([
        // Increment on-document click counter (fast, denormalized)
        AffiliateLink.updateOne(
          { shortCode: link.shortCode },
          { $inc: { clickCount: 1 } }
        ),
        // Creator-level aggregated stats
        CreatorStats.updateOne(
          { creatorId: link.creatorId },
          { $inc: { totalClicks: 1 }, $set: { lastUpdated: new Date() } },
          { upsert: true }
        ),
        // Per-link aggregated stats
        LinkStats.updateOne(
          { shortCode: link.shortCode },
          { $inc: { totalClicks: 1 }, $set: { lastUpdated: new Date() } },
          { upsert: true }
        ),
      ]);
    }
  } catch (err) {
    // Tracking must never crash the redirect
    logger.error("Click tracking failed", { message: err.message, shortCode: link.shortCode });
  }
}

module.exports = router;

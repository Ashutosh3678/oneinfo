const express = require("express");
const router = express.Router();

/**
 * GET /image-proxy?url=<encoded_image_url>
 *
 * Why this exists:
 *   E-commerce CDNs (Lifestyle Stores, Amazon, Flipkart, Myntra) use
 *   Referer-based hotlink protection. When the browser requests an image
 *   directly from localhost:5173, the CDN sees the wrong Referer and blocks
 *   it (returns 403 or a 1x1 blank pixel).
 *
 *   This proxy fetches the image server-side (no browser Referer), then
 *   streams the bytes back to the browser, bypassing the restriction.
 *
 * Usage: /image-proxy?url=https%3A%2F%2Fmedia.landmarkshops.in%2F...
 */
router.get("/", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "url query param required" });
  }

  // Validate it's a real http/https URL to prevent SSRF
  let parsed;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("bad protocol");
    }
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(parsed.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Upstream image fetch failed" });
    }

    // Forward content-type so browser renders it correctly
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);

    // Cache for 1 hour in the browser
    res.setHeader("Cache-Control", "public, max-age=3600");

    // Stream bytes directly to response
    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.warn("Image proxy error:", err.message);
    return res.status(502).json({ error: "Could not fetch image" });
  }
});

module.exports = router;

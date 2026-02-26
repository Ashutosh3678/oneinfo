const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL
  || `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`;

const redisConnection = createClient({
  url: redisUrl,
  password: process.env.REDIS_PASSWORD || undefined,
});

redisConnection.on("connect", () => {
  console.log("✅ Redis connected");
});

redisConnection.on("error", (err) => {
  // Log but never crash the process — Redis errors are non-fatal for the HTTP server
  console.error("❌ Redis client error:", err.message);
});

// Connect async — failures are caught by the error handler above
redisConnection.connect().catch((err) => {
  console.error("❌ Redis initial connect failed:", err.message);
});

module.exports = redisConnection;

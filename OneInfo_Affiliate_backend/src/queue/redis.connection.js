const { createClient } = require("redis");

const redisConnection = createClient({
	url: `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`,
	password: process.env.REDIS_PASSWORD,
});

redisConnection.on("connect", () => {
	console.log("✅ Redis connected");
});

redisConnection.on("error", (err) => {
	console.error("❌ Redis error:", err);
});

redisConnection.connect();

module.exports = redisConnection;

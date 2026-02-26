const { Queue } = require("bullmq");

const redisConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    };

const orderQueue = new Queue("orderQueue", { connection: redisConnection });

orderQueue.on("error", (err) => {
  console.error("[orderQueue] Redis error:", err.message);
});

module.exports = orderQueue;

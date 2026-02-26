const { Queue } = require("bullmq");

const orderQueue = new Queue("orderQueue", {
	connection: {
		host: process.env.REDIS_HOST || "127.0.0.1",
		port: process.env.REDIS_PORT || 6379,
		password: process.env.REDIS_PASSWORD,
	},
});

module.exports = orderQueue;

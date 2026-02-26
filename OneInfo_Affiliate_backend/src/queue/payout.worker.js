require("dotenv").config();
const { Worker } = require("bullmq");
const connectDB = require("../config/db");
const Payout = require("../payouts/payout.model");
const Order = require("../orders/order.model");
const JobFailure = require("../models/jobFailure.model");
const JobMetrics = require("../models/jobMetrics.model");

// 🔌 Connect DB
connectDB();

const worker = new Worker(
	"payoutQueue",
	async (job) => {
		const { creatorId, periodStart, periodEnd } = job.data;

		const orders = await Order.find({
			creatorId,
			status: "confirmed",
			createdAt: {
				$gte: new Date(periodStart),
				$lte: new Date(periodEnd),
			},
		});

		if (!orders.length) return;

		const totalOrders = orders.length;
		const totalRevenue = orders.reduce(
			(sum, o) => sum + (o.orderValue || 0),
			0,
		);

		const totalCommission = orders.reduce(
			(sum, o) => sum + (o.creatorCommissionAmount || 0),
			0,
		);

		// 🛡️ Idempotency Check
		const existing = await Payout.findOne({
			creatorId,
			periodStart,
			periodEnd,
		});
		if (existing) {
			console.log(`⚠️ Payout already exists for ${creatorId} in this period`);
			return;
		}

		await Payout.create({
			creatorId,
			periodStart,
			periodEnd,
			totalOrders,
			totalRevenue,
			totalCommission,
		});
	},
	{
		connection: {
			host: process.env.REDIS_HOST || "127.0.0.1",
			port: process.env.REDIS_PORT || 6379,
			password: process.env.REDIS_PASSWORD,
		},
	},
);

// 🛡️ Graceful Shutdown Handler
async function graceful() {
	console.log("Shutting down payout worker...");
	await worker.close();
	await mongoose.connection.close();
	process.exit(0);
}

process.on("SIGINT", graceful);
process.on("SIGTERM", graceful);

/* ===============================
   SUCCESS METRICS
================================ */
worker.on("completed", async (job) => {
	console.log("✅ Payout job completed:", job.id);

	await JobMetrics.updateOne(
		{ queueName: "payoutQueue" },
		{ $inc: { processedCount: 1 } },
		{ upsert: true },
	);
});

/* ===============================
   FAILURE HANDLING
================================ */
worker.on("failed", async (job, err) => {
	console.error("❌ Payout job failed:", err.message);

	await JobFailure.create({
		jobId: job?.id,
		queueName: "payoutQueue",
		attemptsMade: job?.attemptsMade,
		data: job?.data,
		error: err.message,
		stack: err.stack,
	});

	await JobMetrics.updateOne(
		{ queueName: "payoutQueue" },
		{ $inc: { failedCount: 1 } },
		{ upsert: true },
	);
});

console.log("🟢 Payout worker started...");

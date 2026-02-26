require("dotenv").config();

const mongoose = require("mongoose");
const { Worker } = require("bullmq");

const connectDB = require("../config/db");
const { createOrder } = require("../orders/createOrder.service");
const { processFlipkartReport } = require("../connectors/flipkart.connector");

const JobFailure = require("../models/jobFailure.model");
const JobMetrics = require("../models/jobMetrics.model");
const CreatorStats = require("../models/creatorStats.model");

// 🔌 Connect MongoDB
connectDB();

const worker = new Worker(
	"orderQueue",
	async (job) => {
		console.log(`Processing job: ${job.id} (Type: ${job.name})`);

		// ================================
		// CREATE ORDER JOB
		// ================================
		if (job.name === "createOrder") {
			// 🚀 Fix: Only ONE clean assignment
			const result = await createOrder(job.data);

			if (!result) return;

			const { order, isNew, oldStatus } = result;

			if (order) {
				let update = { $set: { lastUpdated: new Date() } };
				let inc = {};

				// Lifecycle: pending, approved, declined, paid
				const statusFieldMap = {
					pending: "pendingCommission",
					approved: "approvedCommission",
					declined: "declinedCommission",
					paid: "approvedCommission",
				};

				const currentStatusField =
					statusFieldMap[order.status] || "pendingCommission";

				if (isNew) {
					// 🔹 New Order: Increment everything
					inc.lifetimeRevenue = job.data.orderValue || 0;
					inc.lifetimeCommission = order.creatorCommissionAmount || 0;
					inc.lifetimeOrders = 1;
					inc.platformProfit = order.platformCommissionAmount || 0;
					inc[currentStatusField] = order.creatorCommissionAmount || 0;
				} else if (oldStatus !== order.status) {
					// 🔹 Status Update: Transition between buckets
					const oldStatusField =
						statusFieldMap[oldStatus] || "pendingCommission";
					if (oldStatusField !== currentStatusField) {
						inc[oldStatusField] = -order.creatorCommissionAmount;
						inc[currentStatusField] = order.creatorCommissionAmount;
					}
				}

				if (Object.keys(inc).length > 0) {
					update.$inc = inc;
					await CreatorStats.updateOne({ creatorId: order.creatorId }, update, {
						upsert: true,
					});
				}
			}
		}

		// ================================
		// FETCH FLIPKART REPORT JOB
		// ================================
		else if (job.name === "fetchFlipkartReport") {
			console.log("📡 Running automated Flipkart fetch...");
			const creator = await require("../creators/creator.model").findOne({
				email: "test@test.com",
			});
			if (!creator) return;

			const fakeReport = [
				{
					shortCode: "abc123",
					creatorId: creator._id,
					orderId: "AUTO_" + Date.now(),
					productName: "Auto Test Product",
					orderValue: 1500,
					category: "fashion",
				},
			];
			await processFlipkartReport(fakeReport);
		}
	},
	{
		connection: {
			host: process.env.REDIS_HOST || "127.0.0.1",
			port: process.env.REDIS_PORT || 6379,
			password: process.env.REDIS_PASSWORD,
		},
		concurrency: 5,
	},
);

worker.on("completed", async (job) => {
	console.log(`✅ Job ${job.id} completed`);
	await JobMetrics.updateOne(
		{ queueName: "orderQueue" },
		{ $inc: { processedCount: 1 } },
		{ upsert: true },
	);
});

worker.on("failed", async (job, err) => {
	console.error(`❌ Job ${job?.id} failed`, err.message);
	await JobFailure.create({
		jobId: job?.id,
		queueName: "orderQueue",
		attemptsMade: job?.attemptsMade,
		data: job?.data,
		error: err.message,
		stack: err.stack,
	});
	await JobMetrics.updateOne(
		{ queueName: "orderQueue" },
		{ $inc: { failedCount: 1 } },
		{ upsert: true },
	);
});

const graceful = async () => {
	console.log("Shutting down worker...");
	await worker.close();
	await mongoose.connection.close();
	process.exit(0);
};

process.on("SIGINT", graceful);
process.on("SIGTERM", graceful);

console.log("🟢 Order worker started...");

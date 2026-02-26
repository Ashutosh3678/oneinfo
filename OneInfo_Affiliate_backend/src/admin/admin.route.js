const express = require("express");
const bcrypt = require("bcrypt");

const Admin = require("./admin.model");
const { loginAdmin } = require("./admin.service");
const adminMiddleware = require("./admin.middleware");

const { loginLimiter } = require("../middlewares/rateLimit.middleware");

const CommissionRule = require("../commission/commissionRule.model");
const Order = require("../orders/order.model");
const Payout = require("../payouts/payout.model");
const JobFailure = require("../models/jobFailure.model");
const JobMetrics = require("../models/jobMetrics.model");
const CreatorStats = require("../models/creatorStats.model");

const router = express.Router();

/* ============================================================
   ADMIN AUTHENTICATION
============================================================ */

/**
 * CREATE ADMIN (ONLY FIRST TIME)
 */
router.post("/create", async (req, res) => {
  try {
    // Disable in production
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Admin creation disabled in production",
      });
    }

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(403).json({
        error: "Admin already exists",
      });
    }

    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      email,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ADMIN LOGIN (Rate Limited)
 */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginAdmin(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

/* ============================================================
   COMMISSION RULE MANAGEMENT
============================================================ */

router.get("/commission-rules", adminMiddleware, async (req, res) => {
  try {
    const rules = await CommissionRule.find().sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/commission-rule", adminMiddleware, async (req, res) => {
  try {
    const { platform, category, brandCommissionRate, creatorCommissionRate } =
      req.body;

    if (
      !platform ||
      !category ||
      brandCommissionRate == null ||
      creatorCommissionRate == null
    ) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (creatorCommissionRate > brandCommissionRate) {
      return res.status(400).json({
        error: "Creator commission cannot exceed brand commission",
      });
    }

    const rule = await CommissionRule.create({
      platform,
      category,
      brandCommissionRate,
      creatorCommissionRate,
    });

    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/commission-rule/:id", adminMiddleware, async (req, res) => {
  try {
    const { brandCommissionRate, creatorCommissionRate } = req.body;

    if (creatorCommissionRate > brandCommissionRate) {
      return res.status(400).json({
        error: "Creator commission cannot exceed brand commission",
      });
    }

    const updated = await CommissionRule.findByIdAndUpdate(
      req.params.id,
      { brandCommissionRate, creatorCommissionRate },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        error: "Commission rule not found",
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/commission-rule/:id", adminMiddleware, async (req, res) => {
  try {
    const deleted = await CommissionRule.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: "Commission rule not found",
      });
    }

    res.json({ message: "Commission rule deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ============================================================
   ORDER MANAGEMENT (WITH PAGINATION)
============================================================ */

router.get("/orders", adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = status ? { status } : {};

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      page,
      limit,
      count: orders.length,
      orders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * UPDATE ORDER STATUS
 */
router.put("/orders/:id/status", adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["pending", "approved", "declined", "paid"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status value",
      });
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PLATFORM PROFIT (Aggregation Optimized)
 */
router.get("/platform-profit", adminMiddleware, async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          totalPlatformProfit: { $sum: "$platformCommissionAmount" },
          totalCreatorEarnings: { $sum: "$creatorCommissionAmount" },
          count: { $sum: 1 }
        },
      },
    ]);

    // Map into a more readable format
    const dashboard = {
      approved: stats.find(s => s._id === "approved") || { totalPlatformProfit: 0, totalCreatorEarnings: 0, count: 0 },
      pending: stats.find(s => s._id === "pending") || { totalPlatformProfit: 0, totalCreatorEarnings: 0, count: 0 },
      declined: stats.find(s => s._id === "declined") || { totalPlatformProfit: 0, totalCreatorEarnings: 0, count: 0 },
      paid: stats.find(s => s._id === "paid") || { totalPlatformProfit: 0, totalCreatorEarnings: 0, count: 0 },
    };

    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   PAYOUT SYSTEM (DUPLICATE SAFE)
============================================================ */

const payoutQueue = require("../queue/payout.queue");

router.post("/payouts/generate", adminMiddleware, async (req, res) => {
  try {
    const { creatorId, periodStart, periodEnd } = req.body;

    if (!creatorId || !periodStart || !periodEnd) {
      return res.status(400).json({
        error: "creatorId, periodStart and periodEnd are required",
      });
    }

    await payoutQueue.add(
      "generatePayout",
      { creatorId, periodStart, periodEnd },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    res.json({
      message: "Payout job queued successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/payouts/:id/pay", adminMiddleware, async (req, res) => {
  try {
    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      {
        status: "paid",
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({
        error: "Payout not found",
      });
    }

    res.json(payout);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/payouts", adminMiddleware, async (req, res) => {
  try {
    const payouts = await Payout.find().sort({ createdAt: -1 });
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ENTERPRISE MONITORING APIS
============================================================ */

/**
 * GET JOB FAILURES
 */
router.get("/job-failures", adminMiddleware, async (req, res) => {
  try {
    const failures = await JobFailure.find().sort({ failedAt: -1 }).limit(50);
    res.json(failures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET JOB METRICS
 */
router.get("/job-metrics", adminMiddleware, async (req, res) => {
  try {
    const metrics = await JobMetrics.find().sort({ date: -1 });
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET FRAUD REPORT
 */
router.get("/fraud-report", adminMiddleware, async (req, res) => {
  try {
    const fraudClicks = await require("../clicks/click.model").find({ isFraud: true })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(fraudClicks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET TOP CREATORS (By Revenue)
 */
router.get("/top-creators", adminMiddleware, async (req, res) => {
  try {
    const topCreators = await CreatorStats.find()
      .populate("creatorId", "name email")
      .sort({ lifetimeRevenue: -1 })
      .limit(10);
    res.json(topCreators);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ADMITAD MANAGEMENT
============================================================ */

const admitadService = require("../services/admitad.service");
const SyncState = require("../models/syncState.model");

/**
 * GET ADMITAD ACTIONS (For Monitoring)
 */
router.get("/admitad/actions", adminMiddleware, async (req, res) => {
  try {
    const dateStart = req.query.dateStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const actions = await admitadService.fetchActions(dateStart);
    res.json({
      dateStart,
      count: actions.length,
      actions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * MANUAL ADMITAD SYNC
 */
router.post("/admitad/sync", adminMiddleware, async (req, res) => {
  try {
    const { dateStart } = req.body;
    let syncDate = dateStart;

    if (!syncDate) {
      let state = await SyncState.findOne({ platform: "admitad" });
      syncDate = state ? state.lastSync.toISOString().split("T")[0] : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    }

    const actions = await admitadService.fetchActions(syncDate);
    const orderQueue = require("../queue/order.queue");

    for (const action of actions) {
      await orderQueue.add("createOrder", {
        subId: action.subid,
        orderId: action.order_id,
        orderValue: action.payment,
        rawAmount: action.amount,
        status: action.status, // 🚀 Fixed: Pass status in manual sync
        platform: "admitad",
        category: "fashion"
      });
    }

    await SyncState.updateOne(
      { platform: "admitad" },
      { lastSync: new Date() },
      { upsert: true }
    );

    res.json({
      message: `Manual sync triggered for ${actions.length} actions starting from ${syncDate}`,
      count: actions.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

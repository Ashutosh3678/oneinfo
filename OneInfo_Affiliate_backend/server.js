require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const creatorRoutes = require("./src/creators/creator.route");
const logger = require("./src/utils/logger");

const connectDB = require("./src/config/db");
const authMiddleware = require("./src/auth/auth.middleware");
const orderAuthMiddleware = require("./src/middlewares/orderAuth.middleware");

const {
  apiLimiter,
  redirectLimiter,
} = require("./src/middlewares/rateLimit.middleware");

const setupGraphQL = require("./src/graphql");
const { signToken } = require("./src/auth/auth.utils");

const linkRoutes = require("./src/links/link.route");
const redirectRoute = require("./src/redirects/redirect.route");
const orderRoutes = require("./src/orders/order.route");
const adminRoutes = require("./src/admin/admin.route");
const csvRoutes = require("./src/ingestion/csv.route");

const errorMiddleware = require("./src/middlewares/error.middleware");
const imageProxyRoute = require("./src/utils/imageProxy.route");

const app = express();

/* ============================================================
   TRUST PROXY (IMPORTANT FOR RATE LIMIT + IP)
============================================================ */
app.set("trust proxy", 1);

/* ============================================================
   GLOBAL SECURITY MIDDLEWARE
============================================================ */
app.use(helmet());
const cors = require("cors");
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());

/* ============================================================
   HEALTH CHECK — always 200 so Railway healthcheck passes;
   "ready" field reflects DB connection state
============================================================ */
let isReady = false;
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    ready: isReady,
    uptime: process.uptime(),
  });
});

/* ============================================================
   DEV TOKEN ROUTE (only available outside production)
============================================================ */
if (process.env.NODE_ENV !== "production") {
  app.get("/dev/token/:creatorId", (req, res) => {
    const token = signToken(req.params.creatorId);
    res.json({ token });
  });
}

/* ============================================================
   ADMIN ROUTES (Rate Limited)
============================================================ */
app.use("/admin", apiLimiter, adminRoutes);
app.use("/admin", apiLimiter, csvRoutes);

/* ============================================================
   CREATOR AUTH ROUTES (Signup/Login - Rate Limited)
============================================================ */
app.use("/creators", apiLimiter, creatorRoutes);

/* ============================================================
   PUBLIC REDIRECT (Revenue Engine — /share/:code)
   /go is kept as a legacy alias so old shared links still work
============================================================ */
app.use("/share", redirectLimiter, redirectRoute);
app.use("/go",    redirectLimiter, redirectRoute); // legacy alias → redirect to /share

/* ============================================================
   IMAGE PROXY (PUBLIC — no auth — bypasses CDN hotlink blocks)
============================================================ */
app.use("/image-proxy", imageProxyRoute);

/* ============================================================
   CREATOR ROUTES (JWT + Rate Limited)
============================================================ */
app.use("/links", apiLimiter, authMiddleware, linkRoutes);

/* ============================================================
   INTERNAL ORDER ROUTES (API KEY + Rate Limited)
============================================================ */
app.use("/orders", apiLimiter, orderAuthMiddleware, orderRoutes);

/* ============================================================
   GRAPHQL (JWT + Rate Limited)
============================================================ */
app.use("/graphql", apiLimiter, authMiddleware);

/* ============================================================
   GLOBAL ERROR HANDLER (MUST BE LAST)
============================================================ */
app.use(errorMiddleware);

/* ============================================================
   START SERVER — listen immediately so Railway healthcheck passes,
   then connect DB + GraphQL + crons in the background
============================================================ */
const PORT = process.env.PORT || 4000;

(async () => {
  // 1. Start listening RIGHT AWAY — /health is already wired above
  await new Promise((resolve) => {
    app.listen(PORT, "0.0.0.0", () => {
      logger.info("Server listening", {
        port: PORT,
        environment: process.env.NODE_ENV,
      });
      resolve();
    });
  });

  // 2. Connect DB + setup GraphQL
  try {
    await connectDB();
    await setupGraphQL(app);
    isReady = true;
    logger.info("Server fully ready");
  } catch (err) {
    logger.error("DB/GraphQL startup failed", { message: err.message });
    process.exit(1);
  }

  // 3. Start cron jobs AFTER server is ready (so Redis errors don't prevent listen)
  try {
    require("./src/cron/admitad.cron");
    logger.info("Cron jobs started");
  } catch (err) {
    logger.error("Cron startup failed (non-fatal)", { message: err.message });
  }
})();

/* ============================================================
   PROCESS-LEVEL ERROR HANDLING
============================================================ */
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason: reason.message || reason });
  // Recommended: send to monitoring service or exit if critical
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception thrown:", { message: err.message, stack: err.stack });
  process.exit(1); // Allow nodemon/PM2 to restart the process
});

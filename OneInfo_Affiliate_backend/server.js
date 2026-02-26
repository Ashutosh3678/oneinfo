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
   HEALTH CHECK
============================================================ */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
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
   START CRON JOBS
============================================================ */
require("./src/cron/admitad.cron");

/* ============================================================
   START SERVER — async IIFE to properly await DB + GraphQL
============================================================ */
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB();
    await setupGraphQL(app);
    app.listen(PORT, () => {
      logger.info("Server running", {
        port: PORT,
        environment: process.env.NODE_ENV,
      });
    });
  } catch (err) {
    logger.error("Server failed to start", { message: err.message });
    process.exit(1);
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

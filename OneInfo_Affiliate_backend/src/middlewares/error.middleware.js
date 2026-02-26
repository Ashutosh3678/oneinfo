const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  // Log error
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
  });

  // Avoid leaking internal errors in production
  const isProduction = process.env.NODE_ENV === "production";

  res.status(err.status || 500).json({
    error: isProduction
      ? "Internal server error"
      : err.message,
  });
};

const rateLimit = require("express-rate-limit");

// 🔹 General API limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔹 Strict limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Try again later." },
});

// 🔹 Redirect limiter
const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: "Too many clicks. Slow down." },
});

module.exports = {
  apiLimiter,
  loginLimiter,
  redirectLimiter,
};

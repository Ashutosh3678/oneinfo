module.exports = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.ORDER_API_SECRET) {
    return res.status(403).json({
      error: "Unauthorized order creation",
    });
  }

  next();
};

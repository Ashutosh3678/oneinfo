const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.creatorId = decoded.creatorId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};


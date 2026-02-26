const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Admin unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.adminId) {
      return res.status(403).json({ error: "Not an admin token" });
    }

    req.adminId = decoded.adminId;
    req.adminRole = decoded.role;


    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
};



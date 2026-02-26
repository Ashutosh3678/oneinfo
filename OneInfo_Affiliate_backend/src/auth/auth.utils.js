const jwt = require("jsonwebtoken");

exports.signToken = (creatorId) =>
  jwt.sign({ creatorId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  
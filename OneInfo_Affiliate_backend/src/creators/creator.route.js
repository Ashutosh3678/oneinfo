const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Creator = require("./creator.model");

const router = express.Router();

/**
 * CREATOR SIGNUP
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    const existing = await Creator.findOne({ email });
    if (existing) {
      return res.status(400).json({
        error: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const creator = await Creator.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Signup successful",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * CREATOR LOGIN
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const creator = await Creator.findOne({ email });

    if (!creator) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, creator.password);

    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        creatorId: creator._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

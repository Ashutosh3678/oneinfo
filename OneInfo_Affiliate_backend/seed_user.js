require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const Creator = require("./src/creators/creator.model");
const bcrypt = require("bcrypt"); // same lib as creator.route.js

async function seedUser() {
  await connectDB();
  console.log("✅ DB Connected");

  const email = "hemanthchebrolu21@gmail.com";
  const password = "123";

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await Creator.findOneAndUpdate(
    { email },
    {
      $set: {
        name: "Hemanth",
        email,
        password: hashedPassword,
        socialPlatform: "other",
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  console.log("✅ Creator ready:", result.email, "| id:", result._id.toString());
  process.exit(0);
}

seedUser().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});

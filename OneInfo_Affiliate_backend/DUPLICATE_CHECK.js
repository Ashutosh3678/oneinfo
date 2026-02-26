require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const Order = require("./src/orders/order.model");
const { createOrder } = require("./src/orders/createOrder.service");
const Creator = require("./src/creators/creator.model");
const AffiliateLink = require("./src/links/affiliateLink.model");
const CommissionRule = require("./src/commission/commissionRule.model");

async function checkDuplicates() {
  await connectDB();
  console.log("✅ DB Connected");

  // Cleanup
  await Order.deleteMany({ orderId: "DUP_TEST_123" });
  await AffiliateLink.deleteMany({ shortCode: "DUP_LINK" });
  await CommissionRule.deleteMany({ platform: "admitad", category: "dup" });

  // Setup Dependencies
  const creator = await Creator.findOne();
  const cId = creator ? creator._id.toString() : "dummy_creator";

  await AffiliateLink.create({
    shortCode: "DUP_LINK",
    originalUrl: "http://dup.com",
    affiliateUrl: "http://ad.com",
    creatorId: cId,
    platform: "admitad"
  });

  await CommissionRule.create({
    platform: "admitad",
    category: "dup",
    brandCommissionRate: 100,
    creatorCommissionRate: 50
  });

  console.log("--- Run 1: Create Order ---");
  const res1 = await createOrder({
    subId: "DUP_LINK",
    orderId: "DUP_TEST_123",
    orderValue: 100,
    status: "pending",
    platform: "admitad",
    category: "dup"
  });
  console.log("Run 1 Result:", res1.isNew ? "CREATED" : "UPDATED");

  console.log("--- Run 2: Duplicate Order (Same Data) ---");
  const res2 = await createOrder({
    subId: "DUP_LINK",
    orderId: "DUP_TEST_123",
    orderValue: 100,
    status: "pending",
    platform: "admitad",
    category: "dup"
  });
  console.log("Run 2 Result:", res2.isNew ? "CREATED" : "UPDATED");

  if (res2.isNew) {
    console.error("❌ FAILED: Duplicate order created!");
    process.exit(1);
  }

  const count = await Order.countDocuments({ orderId: "DUP_TEST_123" });
  console.log(`Total Orders in DB: ${count}`);

  if (count === 1) {
    console.log("✅ PASSED: Duplicate Rejected/Updated correctly.");
    process.exit(0);
  } else {
    console.error(`❌ FAILED: Found ${count} orders instead of 1.`);
    process.exit(1);
  }
}

checkDuplicates();

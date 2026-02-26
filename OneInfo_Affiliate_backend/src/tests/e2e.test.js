require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { checkClickFraud } = require("../fraud/fraud.service");
const { buildAffiliateUrl } = require("../affiliate/affiliate.service");
const { createOrder } = require("../orders/createOrder.service");
const CommissionRule = require("../commission/commissionRule.model");
const Payout = require("../payouts/payout.model");
const Order = require("../orders/order.model");
const ClickEvent = require("../clicks/click.model");

async function runTests() {
  await connectDB();
  console.log("🚀 Starting E2E System Audit...\n");

  try {
    // 1️⃣ TEST: Commission Engine
    console.log("🧪 Testing Commission Engine...");
    await CommissionRule.deleteMany({ platform: "test_platform" });
    await CommissionRule.create({
      platform: "test_platform",
      category: "electronics",
      brandCommissionRate: 10,  // 10% from brand
      creatorCommissionRate: 7, // 7% to creator
    });

    const orderData = {
      platform: "test_platform",
      category: "electronics",
      orderValue: 1000,
      shortCode: "testCode",
      creatorId: "testCreator",
      orderId: "TEST_ORDER_" + Date.now(),
      productName: "Test Phone"
    };

    const { order } = await createOrder(orderData);
    console.log(`✅ Commission Calculated: Creator gets ${order.creatorCommissionAmount}, Platform profit ${order.platformCommissionAmount}`);
    if (order.creatorCommissionAmount === 70 && order.platformCommissionAmount === 30) {
      console.log("   ✨ Success: Math is correct.");
    } else {
      throw new Error("Commission math failed!");
    }

    // 2️⃣ TEST: Affiliate Injection
    console.log("\n🧪 Testing Affiliate Injection...");
    const flipkartUrl = buildAffiliateUrl({
      platform: "flipkart",
      baseUrl: "https://www.flipkart.com/p/item",
      creatorId: "C123",
      shortCode: "S456"
    });
    console.log("✅ Flipkart URL:", flipkartUrl);
    if (flipkartUrl.includes("affid=C123") && flipkartUrl.includes("affExtParam1=S456")) {
      console.log("   ✨ Success: Flipkart parameters injected.");
    }

    // 3️⃣ TEST: Fraud Detection
    console.log("\n🧪 Testing Fraud Detection (Wait)...");
    const testIp = "1.2.3.4";
    await ClickEvent.deleteMany({ ip: testIp });
    
    // Insert 21 clicks manually to trigger threshold
    const clicks = [];
    for(let i=0; i<21; i++) {
        clicks.push({ ip: testIp, shortCode: "fraudCode", creatorId: "C1" });
    }
    await ClickEvent.insertMany(clicks);
    
    const fraudResult = await checkClickFraud({ ip: testIp, shortCode: "fraudCode" });
    if (fraudResult.isFraud) {
       console.log(`✅ Fraud Detected: ${fraudResult.reason}`);
    } else {
       throw new Error("Fraud detection failed to trigger!");
    }

    // 4️⃣ TEST: Payout Deduplication
    console.log("\n🧪 Testing Payout Deduplication Safety...");
    const payoutData = {
        creatorId: "test_p",
        periodStart: new Date("2024-01-01"),
        periodEnd: new Date("2024-01-31"),
        totalOrders: 1,
        totalRevenue: 100,
        totalCommission: 10
    };
    
    await Payout.deleteMany({ creatorId: "test_p" });
    await Payout.create(payoutData);
    
    try {
        await Payout.create(payoutData);
        throw new Error("Duplicate payout allowed! Index missing?");
    } catch (err) {
        if (err.code === 11000) {
            console.log("✅ Deduplication: DB correctly blocked duplicate payout.");
        } else {
            throw err;
        }
    }

    console.log("\n🏁 SYSTEM AUDIT COMPLETE: ALL CORE ENGINES FUNCTIONAL ✅");

  } catch (error) {
    console.error("\n❌ AUDIT FAILED:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

runTests();

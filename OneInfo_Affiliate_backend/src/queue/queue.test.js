require("dotenv").config();
require("../config/db")();

const orderQueue = require("./order.queue");

async function test() {
  await orderQueue.add("createOrder", {
    shortCode: "abc123",
    creatorId: "creator1",
    orderId: "TEST999",
    productName: "Test Shoe",
    orderValue: 2000,
    platform: "flipkart",
    category: "fashion",
  });

  console.log("✅ Test job added");
  process.exit(0);
}

test();

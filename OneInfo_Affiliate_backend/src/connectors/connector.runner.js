require("dotenv").config();

const connectDB = require("../config/db");
const { processFlipkartReport } = require("./flipkart.connector");
const { processMeeshoReport } = require("./meesho.connector");

connectDB();

async function run() {
  const fakeFlipkartReport = [
    {
      shortCode: "abc123",
      creatorId: "creator1",
      orderId: "FLIP12345",
      productName: "Shoes",
      orderValue: 2500,
      category: "fashion",
    },
  ];

  const fakeMeeshoReport = [
    {
      shortCode: "xyz789",
      creatorId: "creator2",
      orderId: "MEE12345",
      productName: "T-shirt",
      orderValue: 1200,
      category: "fashion",
    },
  ];

  await processFlipkartReport(fakeFlipkartReport);
  await processMeeshoReport(fakeMeeshoReport);

  console.log("✅ Connector run completed");
}

run();

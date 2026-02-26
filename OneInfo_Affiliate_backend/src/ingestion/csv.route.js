const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { parseCSV } = require("./csv.parser");
const { pushRowsToQueue } = require("./csv.service");

const router = express.Router();

// Temporary upload folder
const upload = multer({
  dest: "uploads/",
});

router.post(
  "/upload-report",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "CSV file required" });
      }

      const platform = req.body.platform;

      if (!platform) {
        return res.status(400).json({ error: "Platform required" });
      }

      const filePath = path.resolve(req.file.path);

      // 1️⃣ Parse CSV
      const rows = await parseCSV(filePath);

      // 2️⃣ Push to queue
      await pushRowsToQueue(rows, platform);

      // 3️⃣ Delete file after processing
      fs.unlinkSync(filePath);

      res.json({
        message: "CSV uploaded and jobs queued successfully",
        totalRows: rows.length,
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

module.exports = router;

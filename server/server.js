const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

// Fail fast at startup if required cryptographic secrets are missing
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is missing. Server cannot sign authentication tokens safely.");
  process.exit(1);
}

const componentRoutes = require("./routes/componentRoutes");
const authRoutes = require("./routes/authRoutes");
const savedPartRoutes = require("./routes/savedPartRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
app.use(
  "/uploads",
  (req, res, next) => {
    // Prevent browser MIME-type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Render PDF datasheets inline in browser instead of forcing download
    if (req.path.toLowerCase().endsWith(".pdf")) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
    }
    next();
  },
  express.static(uploadsDir)
);

app.use("/api/components", componentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/saved-parts", savedPartRoutes);
app.use("/api/uploads", uploadRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Cirqon API is running",
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Cirqon server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

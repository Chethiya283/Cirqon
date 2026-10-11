const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const componentRoutes = require("./routes/componentRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/components", componentRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Cirqon API is running",
  });
});

// Connect to MongoDB
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
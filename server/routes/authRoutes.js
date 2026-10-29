const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Registers a new user account with bcrypt salted hash; role is forced to user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Full name is required.",
      });
    }
    const normalizedEmail = (email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "A valid email address is required.",
      });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email address already exists.",
      });
    }
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "user", // Forced role: prevents privilege escalation
    });

    await newUser.save();
    res.status(201).json({
      message: "User registered successfully.",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    // Handle MongoDB unique index violation race condition (E11000)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email address already exists.",
      });
    }

    console.error("Error registering user:", error.message);
    res.status(500).json({
      message: "Server error occurred while creating user account.",
    });
  }
});

// Authenticates credentials and returns signed JWT; generic error prevents user enumeration
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Generic error message: prevents email enumeration
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Generic error message: prevents credential discovery
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );
    res.json({
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error during user login:", error.message);
    res.status(500).json({
      message: "Server error occurred during authentication.",
    });
  }
});

// Returns authenticated user profile attached by requireAuth
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;

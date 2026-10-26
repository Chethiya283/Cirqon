const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

/**
 * POST /api/auth/register
 * 
 * Public endpoint to register a new engineer user account.
 * 
 * VIVA EXPLANATION:
 * 1. Server-Side Validation: Never trust client input. The server validates that name
 *    is provided, email conforms to regex RFC standards, and password meets length >= 8.
 * 2. Duplicate Account Prevention: Queries existing users by normalized lowercase email
 *    and returns HTTP 409 Conflict if already registered.
 * 3. Cryptographic Salting & Hashing: Uses bcrypt with 12 salt rounds. Salting injects
 *    cryptographic randomness so identical passwords yield distinct hashes, defeating
 *    rainbow table lookup attacks. 12 rounds ensures high computational cost for brute force.
 * 4. Mass-Assignment & Privilege Escalation Prevention: The user role is strictly hardcoded
 *    to "user" regardless of any `role: "admin"` property supplied in the request body.
 * 5. Data Sanitization: The returned response payload specifically omits `passwordHash`,
 *    preventing accidental hash leakage across the API boundary.
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate full name
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Full name is required.",
      });
    }

    // 2. Validate email address format
    const normalizedEmail = (email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "A valid email address is required.",
      });
    }

    // 3. Validate password length (minimum 8 characters)
    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    // 4. Check for existing account with this email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email address already exists.",
      });
    }

    // 5. Generate salt and hash the password (cost factor = 12 rounds)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 6. Persist user with forced "user" role (ignores any client-supplied role)
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "user", // Forced role: prevents privilege escalation
    });

    await newUser.save();

    // 7. Return created user representation WITHOUT passwordHash
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

module.exports = router;


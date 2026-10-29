const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/authMiddleware");

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

/**
 * POST /api/auth/login
 * 
 * Public endpoint to authenticate an engineer and receive a signed JWT.
 * 
 * VIVA EXPLANATION:
 * 1. Mitigation of User Enumeration Attacks:
 *    Whether an email is nonexistent or the password is incorrect, the server returns
 *    the exact same generic HTTP 401 error: "Invalid email or password."
 *    This prevents attackers from probing the system to build lists of registered emails.
 * 
 * 2. Bcrypt Password Verification:
 *    The plaintext password submitted by the user is compared against the stored hash
 *    using `bcrypt.compare()`. Bcrypt extracts the salt embedded in the stored hash,
 *    hashes the candidate password, and performs a constant-time comparison to avoid
 *    timing side-channel attacks.
 * 
 * 3. JWT Stateless Issuance:
 *    On successful verification, a signed JSON Web Token is minted with:
 *    - Payload: `{ id, role }` only (minimal surface area, no sensitive data like passwords).
 *    - Expiry: 7 days (`expiresIn: "7d"`).
 *    - Signature: Signed with `process.env.JWT_SECRET`.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate presence of credentials
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user by normalized lowercase email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Generic error message: prevents email enumeration
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // 2. Verify candidate password against stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Generic error message: prevents credential discovery
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // 3. Sign JWT with minimal claims (user id and role only)
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

    // 4. Return token and sanitized user representation (no passwordHash)
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

/**
 * GET /api/auth/me
 * 
 * Protected endpoint returning the profile of the currently authenticated user.
 * 
 * VIVA EXPLANATION:
 * Protected by the `requireAuth` middleware. If the incoming request has a valid
 * Bearer token, the middleware attaches the resolved user document to `req.user`
 * (with `passwordHash` omitted). This endpoint simply outputs `req.user`.
 */
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;

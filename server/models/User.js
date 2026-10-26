const mongoose = require("mongoose");

/**
 * User Schema
 * 
 * VIVA EXPLANATION:
 * 1. Password Hashing & Salting: Passwords are NEVER stored in plaintext. The `passwordHash`
 *    field stores a one-way bcrypt digest generated using a unique salt (cost factor >= 10).
 *    Salting prevents precomputed rainbow table attacks, and hashing ensures that even
 *    if the database is compromised, user credentials cannot be reversed.
 * 2. Role-Based Access Control (RBAC): The `role` field is strictly defined as an enum
 *    (["user", "admin"]) with a default of "user". Restricting available roles prevents
 *    arbitrary privilege assignment.
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },

  email: {
    type: String,
    required: [true, "Email address is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },

  passwordHash: {
    type: String,
    required: [true, "Password hash is required"],
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);


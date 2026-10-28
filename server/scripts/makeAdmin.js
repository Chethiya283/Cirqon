/**
 * server/scripts/makeAdmin.js
 *
 * Administrative CLI utility to promote an existing user to the "admin" role.
 *
 * VIVA EXPLANATION:
 * 1. Role-Based Access Control (RBAC) & Privilege Separation:
 *    Administrative privileges (creating, updating, and deleting components in the catalogue)
 *    must be strictly isolated. The public registration endpoint (`/api/auth/register`) hardcodes
 *    `role: "user"` and rejects any client-supplied role parameters to prevent Privilege Escalation
 *    vulnerabilities (CWE-269 / OWASP API4).
 * 2. Out-of-Band Administrative Provisioning:
 *    Admin privileges can only be granted via direct access to the secure server environment
 *    through this script. This ensures no public network endpoint exists that could be abused to
 *    create or promote administrative users.
 * 3. Dry-Run Verification Flag:
 *    The `--dry-run` flag allows operators to inspect and test the user lookup and target role
 *    change before applying persistent writes to MongoDB.
 */

const path = require("path");

// Ensure resolution of server dependencies
if (!module.paths.includes(path.resolve(__dirname, "../node_modules"))) {
  module.paths.push(path.resolve(__dirname, "../node_modules"));
}

const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const User = require("../models/User");

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const filteredArgs = args.filter((arg) => arg !== "--dry-run");

  let email = "";
  for (let i = 0; i < filteredArgs.length; i++) {
    if (filteredArgs[i] === "--email" && filteredArgs[i + 1]) {
      email = filteredArgs[i + 1];
      break;
    } else if (!filteredArgs[i].startsWith("--")) {
      email = filteredArgs[i];
      break;
    }
  }

  if (!email || !email.trim()) {
    console.log("Usage: node server/scripts/makeAdmin.js <user-email> [--dry-run]");
    console.log("Example: node server/scripts/makeAdmin.js engineer@example.com --dry-run");
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!process.env.MONGODB_URI) {
    console.error("FATAL ERROR: MONGODB_URI is not defined in server/.env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.error(`Error: User with email "${normalizedEmail}" was not found.`);
      process.exit(1);
    }

    if (user.role === "admin") {
      console.log(`User "${user.name}" (${user.email}) is already an administrator.`);
      return;
    }

    if (isDryRun) {
      console.log(
        `[DRY RUN] Found user "${user.name}" (${user.email}) with current role "${user.role}". Would update role to "admin". No changes saved.`
      );
      return;
    }

    user.role = "admin";
    await user.save();
    console.log(
      `SUCCESS: Promoted user "${user.name}" (${user.email}) to role "admin".`
    );
  } catch (error) {
    console.error("Failed to update user role:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}


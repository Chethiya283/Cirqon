// CLI utility for out-of-band admin role promotion (no public promotion endpoint)

const path = require("path");

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


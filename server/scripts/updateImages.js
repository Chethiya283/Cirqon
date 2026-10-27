/**
 * server/scripts/updateImages.js
 *
 * Viva Notes:
 * 1. Safe Database Updates: Uses MongoDB's atomic `$set` operator to update ONLY
 *    the `imageUrl` field on matched components. No other fields, indexes, or
 *    schema validations are touched.
 * 2. Preview / Dry-run Safety: The `--dry-run` flag performs full audit and path
 *    matching without executing write operations, preventing accidental data corruption.
 * 3. Strict String Matching & Leading Zeros Preservation: Part numbers (like Molex "0022232041")
 *    are explicitly cast and handled as strings (`String(val).trim()`). They are NEVER parsed
 *    as numbers, which would strip leading zeros (e.g. turning "0022232041" into 22232041).
 * 4. Targeted Part Updating: Supports `--part <MPN>` to selectively update a single component
 *    record in the database without affecting any other records.
 * 5. Case-Insensitive Matching: Compares `partNumber.toLowerCase()` against the
 *    filename stem to ensure case differences do not prevent correct image linking.
 */

const fs = require("fs");
const path = require("path");

// Ensure resolution of server dependencies when invoked from any directory
if (!module.paths.includes(path.resolve(__dirname, "../node_modules"))) {
  module.paths.push(path.resolve(__dirname, "../node_modules"));
}

const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const Component = require("../models/Component");

async function runImageUpdate() {
  const isDryRun = process.argv.includes("--dry-run");

  // Optional target part filter (e.g. --part 0022232041)
  const partArgIndex = process.argv.findIndex((a) => a === "--part" || a === "--mpn");
  const targetPartFilter = partArgIndex !== -1 && process.argv[partArgIndex + 1]
    ? String(process.argv[partArgIndex + 1]).trim()
    : null;

  console.log("=".repeat(65));
  console.log(` CIRQON COMPONENT IMAGE UPDATE UTILITY`);
  console.log(` Mode: ${isDryRun ? ">>> DRY RUN (Preview only, no DB writes) <<<" : ">>> REAL RUN (Writing to Database) <<<"}`);
  if (targetPartFilter) {
    console.log(` Scope: Specific part filter active -> "${targetPartFilter}" (preserving leading zeros)`);
  } else {
    console.log(` Scope: All catalogue components`);
  }
  console.log("=".repeat(65));

  // Resolve directory of client webp assets
  const imagesDir = path.resolve(__dirname, "../../client/public/images/components");
  if (!fs.existsSync(imagesDir)) {
    console.error(`Error: Images directory not found: ${imagesDir}`);
    process.exit(1);
  }

  // Read all .webp image files
  const dirEntries = fs.readdirSync(imagesDir);
  const webpFiles = dirEntries.filter((file) =>
    file.toLowerCase().endsWith(".webp")
  );

  console.log(`Scanned directory: client/public/images/components/`);
  console.log(`Found ${webpFiles.length} .webp image file(s) on disk.\n`);

  let components = [];
  let connectedToDb = false;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in server/.env");
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    connectedToDb = true;
    console.log("Connected successfully to database.\n");

    components = await Component.find({});
  } catch (err) {
    if (isDryRun) {
      console.warn(`[WARN] Database connection unavailable (${err.message}).`);
      console.warn(`[INFO] Falling back to server/seedComponents.js for dry-run inspection.\n`);

      const seedPath = path.resolve(__dirname, "../seedComponents.js");
      const seedContent = fs.readFileSync(seedPath, "utf8");
      const startMarker = "const components = [";
      const endMarker = "function buildSetObject";
      const startIdx = seedContent.indexOf(startMarker);
      const endIdx = seedContent.indexOf(endMarker);

      if (startIdx !== -1 && endIdx !== -1) {
        const jsonCode = seedContent
          .substring(startIdx + "const components = ".length, endIdx)
          .trim()
          .replace(/;\s*$/, "");
        components = eval(jsonCode);
      } else {
        throw new Error("Failed to parse fallback components from seedComponents.js");
      }
    } else {
      console.error(`[FATAL] Database connection failed: ${err.message}`);
      process.exit(1);
    }
  }

  const toUpdate = [];
  const unmatchedFiles = [];
  const matchedPartNumbers = new Set();

  // Match each .webp file to a component partNumber (strictly as strings, case-insensitive)
  for (const file of webpFiles) {
    // Preserve leading zeros by strictly treating filename stem as string
    const fileStem = String(path.basename(file, path.extname(file))).trim();

    const matched = components.find((c) => {
      const compMpn = String(c.partNumber ?? "").trim();
      return compMpn.toLowerCase() === fileStem.toLowerCase();
    });

    if (matched) {
      const canonicalMpn = String(matched.partNumber).trim();
      matchedPartNumbers.add(canonicalMpn.toLowerCase());

      // If a specific part was requested, skip parts that do not match the filter
      if (targetPartFilter && canonicalMpn.toLowerCase() !== targetPartFilter.toLowerCase()) {
        continue;
      }

      const targetUrl = `/images/components/${file}`;
      toUpdate.push({
        partNumber: canonicalMpn,
        matchedFile: file,
        currentImageUrl: matched.imageUrl || "(none)",
        targetImageUrl: targetUrl,
        componentId: matched._id,
      });
    } else {
      unmatchedFiles.push(file);
    }
  }

  // Check for components with no matching .webp file
  const componentsWithoutWebp = components.filter((c) => {
    const compMpn = String(c.partNumber ?? "").trim();
    return !matchedPartNumbers.has(compMpn.toLowerCase());
  });

  // 1. Output components to update
  console.log(`--- 1. Components to Update (${toUpdate.length}) ---`);
  if (toUpdate.length === 0) {
    console.log("  No matching components found for update.");
  } else {
    for (const item of toUpdate) {
      console.log(`  [UPDATE] ${item.partNumber.padEnd(18)} : "${item.currentImageUrl}" -> "${item.targetImageUrl}"`);

      // If real run, perform MongoDB atomic update
      if (!isDryRun && connectedToDb && item.componentId) {
        await Component.updateOne(
          { _id: item.componentId },
          { $set: { imageUrl: item.targetImageUrl } }
        );
      }
    }
  }
  console.log();

  // 2. Output files with no matching part
  console.log(`--- 2. Files with No Matching Component (${unmatchedFiles.length}) ---`);
  if (unmatchedFiles.length === 0) {
    console.log("  None. All .webp files correspond to a component part number.");
  } else {
    for (const file of unmatchedFiles) {
      console.log(`  [UNMATCHED FILE] ${file} (no component with matching partNumber found in catalogue)`);
    }
  }
  console.log();

  // 3. Output components with no .webp file
  console.log(`--- 3. Components with No .webp File (${componentsWithoutWebp.length}) ---`);
  if (componentsWithoutWebp.length === 0) {
    console.log("  None. All catalogue components have a matching .webp image.");
  } else {
    for (const comp of componentsWithoutWebp) {
      const compMpn = String(comp.partNumber ?? "").trim();
      console.log(`  [MISSING WEBP]   ${compMpn.padEnd(18)} (${comp.name})`);
    }
  }
  console.log();

  console.log("=".repeat(65));
  if (isDryRun) {
    console.log(` RESULT: DRY RUN complete. ${toUpdate.length} component(s) identified for update.`);
    console.log(` NOTE: No database changes were made.`);
  } else {
    console.log(` RESULT: REAL RUN complete. ${toUpdate.length} component record(s) updated in database.`);
  }
  console.log("=".repeat(65));

  if (connectedToDb) {
    await mongoose.disconnect();
  }
}

runImageUpdate().catch((err) => {
  console.error("Script error:", err.message);
  process.exit(1);
});

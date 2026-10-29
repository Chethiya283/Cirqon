// Updates component imageUrl paths in MongoDB from client/public/images/components/

const fs = require("fs");
const path = require("path");

if (!module.paths.includes(path.resolve(__dirname, "../node_modules"))) {
  module.paths.push(path.resolve(__dirname, "../node_modules"));
}

const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const Component = require("../models/Component");

async function runImageUpdate() {
  const isDryRun = process.argv.includes("--dry-run");

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

  const clientImagesDir = path.resolve(
    __dirname,
    "../../client/public/images/components"
  );

  let webpFiles = [];
  try {
    const allFiles = fs.readdirSync(clientImagesDir);
    webpFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".webp"));
  } catch (err) {
    console.error(`[ERROR] Unable to read directory: ${clientImagesDir}`);
    console.error(`Reason: ${err.message}`);
    process.exit(1);
  }

  console.log(`Scanned directory: client/public/images/components/`);
  console.log(`Found ${webpFiles.length} .webp image file(s) on disk.\n`);

  let components = [];
  try {
    if (!isDryRun) {
      console.log("Connecting to MongoDB Atlas...");
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Connected successfully to database.\n");
    }

    components = await Component.find({});
  } catch (err) {
    if (isDryRun) {
      console.warn(`[WARN] Database connection unavailable (${err.message}).`);
      console.warn(`[INFO] Falling back to server/scripts/seedComponents.js for dry-run inspection.\n`);

      const seedPath = path.resolve(__dirname, "./seedComponents.js");
      const seedContent = fs.readFileSync(seedPath, "utf8");
      const startMarker = "const components = [";
      const endMarker = "function buildSetObject";
      const startIdx = seedContent.indexOf(startMarker);
      const endIdx = seedContent.indexOf(endMarker);

      if (startIdx !== -1 && endIdx !== -1) {
        const jsonCode = seedContent
          .slice(startIdx + startMarker.length - 1, endIdx)
          .trim()
          .replace(/;$/, "");
        components = eval(jsonCode);
      } else {
        throw new Error("Failed to parse fallback components from seedComponents.js");
      }
    } else {
      console.error("[FATAL] Failed to connect to MongoDB Atlas:", err.message);
      process.exit(1);
    }
  }

  const toUpdate = [];
  const matchedWebpFiles = new Set();

  for (const filename of webpFiles) {
    // Preserve leading zeros by strictly treating filename stem as string
    const stem = path.basename(filename, path.extname(filename)).trim();

    const matchedComponent = components.find((c) => {
      const compMpn = String(c.partNumber ?? "").trim();
      return compMpn.toLowerCase() === stem.toLowerCase();
    });

    if (matchedComponent) {
      matchedWebpFiles.add(filename);
      const targetImageUrl = `/images/components/${filename}`;
      const currentImageUrl = matchedComponent.imageUrl || "(none)";

      if (targetPartFilter && String(matchedComponent.partNumber).toLowerCase() !== targetPartFilter.toLowerCase()) {
        continue;
      }

      toUpdate.push({
        id: matchedComponent._id,
        partNumber: String(matchedComponent.partNumber),
        name: matchedComponent.name,
        targetImageUrl,
        currentImageUrl,
      });
    }
  }

  const unmatchedFiles = webpFiles.filter((f) => !matchedWebpFiles.has(f));

  const componentsWithoutWebp = components.filter((comp) => {
    const compMpn = String(comp.partNumber ?? "").trim().toLowerCase();
    return !webpFiles.some((f) => {
      const stem = path.basename(f, path.extname(f)).trim().toLowerCase();
      return stem === compMpn;
    });
  });

  console.log(`--- 1. Components to Update (${toUpdate.length}) ---`);
  if (toUpdate.length === 0) {
    console.log("  No matching components found for update.");
  } else {
    for (const item of toUpdate) {
      console.log(`  [UPDATE] ${item.partNumber.padEnd(18)} : "${item.currentImageUrl}" -> "${item.targetImageUrl}"`);

      if (!isDryRun && item.id) {
        await Component.updateOne(
          { _id: item.id },
          { $set: { imageUrl: item.targetImageUrl } }
        );
      }
    }
  }
  console.log();

  console.log(`--- 2. Files with No Matching Component (${unmatchedFiles.length}) ---`);
  if (unmatchedFiles.length === 0) {
    console.log("  None. All .webp files correspond to a component part number.");
  } else {
    for (const file of unmatchedFiles) {
      console.log(`  [UNMATCHED FILE] ${file} (no component with matching partNumber found in catalogue)`);
    }
  }
  console.log();

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

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

runImageUpdate().catch((err) => {
  console.error("Script failed with unhandled error:", err);
  process.exit(1);
});

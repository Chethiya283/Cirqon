const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Component = require("../models/Component");
const SavedPart = require("../models/SavedPart");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/**
 * Permitted component categories.
 * Enforced on both server and client validation to maintain data integrity.
 */
const ALLOWED_CATEGORIES = [
  "Resistors",
  "Capacitors",
  "Inductors",
  "Diodes and LEDs",
  "BJTs and MOSFETs",
  "Integrated circuits (ICs)",
  "Voltage regulators",
  "Connectors",
  "Switches and protection components",
];

/**
 * Escapes special characters for safe regular expression matching.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates that a string is a well-formed HTTP or HTTPS URL, or a local /uploads/ asset path.
 */
function isValidHttpUrl(urlString) {
  if (typeof urlString !== "string") return false;
  const trimmed = urlString.trim();
  if (!trimmed) return true; // Empty string is acceptable for optional URL fields
  if (trimmed.startsWith("/uploads/")) return true; // Accept uploaded local files
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * VIVA EXPLANATION — 4. Why Old Uploaded Files are Deleted from Disk (Storage Hygiene & Traversal Defense):
 * When a component's imageUrl or datasheetUrl is replaced or the component itself is deleted,
 * leaving old files on disk causes storage leaks and disk exhaustion over time.
 * Security Guard: We ensure the file path strictly begins with "/uploads/" and resolve it
 * against the absolute server/uploads directory using path.resolve(). Verifying that the target
 * strictly resides inside server/uploads guards against path traversal (e.g. attempting to delete
 * system or code files via "../").
 */
function safelyDeleteUploadedFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return;
  const trimmed = fileUrl.trim();
  if (!trimmed.startsWith("/uploads/")) return;

  const uploadsRoot = path.resolve(__dirname, "../uploads");
  const relativeSubpath = trimmed.slice("/uploads/".length);
  const resolvedPath = path.resolve(uploadsRoot, relativeSubpath);

  // Security guard against path traversal attacks
  if (!resolvedPath.startsWith(uploadsRoot + path.sep)) {
    console.warn("Security warning: Blocked path traversal attempt in file deletion:", trimmed);
    return;
  }

  try {
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      fs.unlinkSync(resolvedPath);
      console.log("Successfully removed unreferenced upload:", resolvedPath);
    }
  } catch (err) {
    console.error("Failed to delete unreferenced upload:", err.message);
  }
}

/**
 * Validates image URLs: supports both external HTTP(S) URLs and local relative paths (e.g. /images/...).
 */
function isValidImageUrl(urlString) {
  if (typeof urlString !== "string") return false;
  const trimmed = urlString.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * VIVA EXPLANATION — 1. Whitelisting Request Fields (Mass Assignment Defense / CWE-915):
 * Never trust `req.body` directly. If raw client input were passed directly into Mongoose
 * methods (like `Model.create()` or `findByIdAndUpdate()`), an attacker could inject
 * unauthorized internal attributes, attempt to overwrite MongoDB's immutable `_id`, modify
 * timestamps (`createdAt`), or alter administrative flags. By explicitly picking only
 * recognized, validated schema properties, we ensure strict data sanitization and boundary control.
 */
function extractWhitelistedComponentFields(body, isUpdate = false) {
  const allowed = {};

  if (body.partNumber !== undefined) {
    allowed.partNumber =
      typeof body.partNumber === "string"
        ? body.partNumber.trim()
        : body.partNumber;
  }

  if (body.name !== undefined) {
    allowed.name =
      typeof body.name === "string" ? body.name.trim() : body.name;
  }

  if (body.manufacturer !== undefined) {
    allowed.manufacturer =
      typeof body.manufacturer === "string"
        ? body.manufacturer.trim()
        : body.manufacturer;
  }

  if (body.category !== undefined) {
    allowed.category =
      typeof body.category === "string" ? body.category.trim() : body.category;
  }

  if (body.description !== undefined) {
    allowed.description =
      typeof body.description === "string" ? body.description.trim() : "";
  }

  if (body.imageUrl !== undefined) {
    allowed.imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  }

  if (body.datasheetUrl !== undefined) {
    allowed.datasheetUrl =
      typeof body.datasheetUrl === "string" ? body.datasheetUrl.trim() : "";
  }

  if (body.manufacturerUrl !== undefined) {
    allowed.manufacturerUrl =
      typeof body.manufacturerUrl === "string"
        ? body.manufacturerUrl.trim()
        : "";
  }

  if (body.dataStatus !== undefined) {
    allowed.dataStatus = body.dataStatus;
  }

  if (body.isActive !== undefined) {
    allowed.isActive = Boolean(body.isActive);
  }

  // Specifications map
  if (body.specifications !== undefined) {
    if (
      body.specifications &&
      typeof body.specifications === "object" &&
      !Array.isArray(body.specifications)
    ) {
      allowed.specifications = body.specifications;
    } else if (!isUpdate) {
      allowed.specifications = {};
    }
  }

  // Package & mechanical packaging object
  if (body.package !== undefined) {
    if (
      body.package &&
      typeof body.package === "object" &&
      !Array.isArray(body.package)
    ) {
      const pkg = {};

      if (body.package.name !== undefined) {
        pkg.name =
          typeof body.package.name === "string"
            ? body.package.name.trim()
            : String(body.package.name || "");
      }

      if (body.package.mountingType !== undefined) {
        pkg.mountingType = body.package.mountingType
          ? String(body.package.mountingType).trim()
          : undefined;
      }

      if (
        body.package.bodyDimensions &&
        typeof body.package.bodyDimensions === "object"
      ) {
        pkg.bodyDimensions = {
          lengthMm:
            body.package.bodyDimensions.lengthMm != null
              ? Number(body.package.bodyDimensions.lengthMm)
              : undefined,
          widthMm:
            body.package.bodyDimensions.widthMm != null
              ? Number(body.package.bodyDimensions.widthMm)
              : undefined,
          heightMm:
            body.package.bodyDimensions.heightMm != null
              ? Number(body.package.bodyDimensions.heightMm)
              : undefined,
          seatedHeightMm:
            body.package.bodyDimensions.seatedHeightMm != null
              ? Number(body.package.bodyDimensions.seatedHeightMm)
              : undefined,
        };
      }

      if (
        body.package.pcbLayout &&
        typeof body.package.pcbLayout === "object"
      ) {
        pkg.pcbLayout = {
          leadPitchMm:
            body.package.pcbLayout.leadPitchMm != null
              ? Number(body.package.pcbLayout.leadPitchMm)
              : undefined,
          rowSpacingMm:
            body.package.pcbLayout.rowSpacingMm != null
              ? Number(body.package.pcbLayout.rowSpacingMm)
              : undefined,
          drillDiameterMm:
            body.package.pcbLayout.drillDiameterMm != null
              ? Number(body.package.pcbLayout.drillDiameterMm)
              : undefined,
          padDiameterMm:
            body.package.pcbLayout.padDiameterMm != null
              ? Number(body.package.pcbLayout.padDiameterMm)
              : undefined,
        };
      }

      if (
        body.package.footprintDimensions &&
        typeof body.package.footprintDimensions === "object"
      ) {
        pkg.footprintDimensions = {
          lengthMm:
            body.package.footprintDimensions.lengthMm != null
              ? Number(body.package.footprintDimensions.lengthMm)
              : undefined,
          widthMm:
            body.package.footprintDimensions.widthMm != null
              ? Number(body.package.footprintDimensions.widthMm)
              : undefined,
          heightMm:
            body.package.footprintDimensions.heightMm != null
              ? Number(body.package.footprintDimensions.heightMm)
              : undefined,
        };
      }

      if (body.package.padLayout !== undefined) {
        pkg.padLayout = String(body.package.padLayout || "").trim();
      }

      if (body.package.landPatternUrl !== undefined) {
        pkg.landPatternUrl = String(body.package.landPatternUrl || "").trim();
      }

      allowed.package = pkg;
    }
  }

  // Pins array
  if (body.pins !== undefined) {
    if (Array.isArray(body.pins)) {
      allowed.pins = body.pins.map((pin) => ({
        number: pin.number != null ? Number(pin.number) : undefined,
        name: pin.name != null ? String(pin.name).trim() : "",
        function: pin.function != null ? String(pin.function).trim() : "",
      }));
    }
  }

  return allowed;
}

/**
 * Validates component input payloads for required fields, enum constraints, positive numbers, and URL formats.
 */
function validateComponentPayload(body, isUpdate = false) {
  const errors = [];

  // Required core fields (partNumber, name, manufacturer, category)
  if (!isUpdate || body.partNumber !== undefined) {
    if (
      !body.partNumber ||
      typeof body.partNumber !== "string" ||
      !body.partNumber.trim()
    ) {
      errors.push("Part number is required.");
    }
  }

  if (!isUpdate || body.name !== undefined) {
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      errors.push("Component name is required.");
    }
  }

  if (!isUpdate || body.manufacturer !== undefined) {
    if (
      !body.manufacturer ||
      typeof body.manufacturer !== "string" ||
      !body.manufacturer.trim()
    ) {
      errors.push("Manufacturer is required.");
    }
  }

  if (!isUpdate || body.category !== undefined) {
    if (
      !body.category ||
      typeof body.category !== "string" ||
      !body.category.trim()
    ) {
      errors.push("Category is required.");
    } else if (!ALLOWED_CATEGORIES.includes(body.category.trim())) {
      errors.push(
        `Invalid category "${body.category.trim()}". Must be one of: ${ALLOWED_CATEGORIES.join(
          ", "
        )}.`
      );
    }
  }

  // URLs must be valid http(s) if given
  if (body.datasheetUrl) {
    if (!isValidHttpUrl(body.datasheetUrl)) {
      errors.push("Datasheet URL must be a valid HTTP or HTTPS URL.");
    }
  }

  if (body.manufacturerUrl) {
    if (!isValidHttpUrl(body.manufacturerUrl)) {
      errors.push("Manufacturer URL must be a valid HTTP or HTTPS URL.");
    }
  }

  if (body.imageUrl) {
    if (!isValidImageUrl(body.imageUrl)) {
      errors.push(
        "Image URL must be a valid HTTP, HTTPS, or relative image path."
      );
    }
  }

  if (body.package?.landPatternUrl) {
    if (!isValidHttpUrl(body.package.landPatternUrl)) {
      errors.push("Land pattern URL must be a valid HTTP or HTTPS URL.");
    }
  }

  // pinCount must be a positive integer if given
  if (
    body.pinCount !== undefined &&
    body.pinCount !== null &&
    body.pinCount !== ""
  ) {
    const pc = Number(body.pinCount);
    if (!Number.isInteger(pc) || pc <= 0) {
      errors.push("pinCount must be a positive integer.");
    }
  }

  // Mounting type validation if provided
  if (body.package?.mountingType) {
    const validMounting = ["Through-Hole", "Surface-Mount"];
    if (!validMounting.includes(body.package.mountingType)) {
      errors.push(
        "Mounting type must be either 'Through-Hole' or 'Surface-Mount'."
      );
    }
  }

  // dataStatus validation if provided
  if (body.dataStatus) {
    if (!["verified", "incomplete"].includes(body.dataStatus)) {
      errors.push("dataStatus must be either 'verified' or 'incomplete'.");
    }
  }

  // Pins validation: positive integers, unique within part, non-empty names
  if (body.pins !== undefined) {
    if (!Array.isArray(body.pins)) {
      errors.push("Pins must be provided as an array.");
    } else {
      const pinNumbersSeen = new Set();
      for (let i = 0; i < body.pins.length; i++) {
        const pin = body.pins[i];
        if (!pin || typeof pin !== "object") {
          errors.push(`Pin at row ${i + 1} must be an object.`);
          continue;
        }

        const rawNum = pin.number;
        const pinNum = Number(rawNum);
        if (
          rawNum === undefined ||
          rawNum === null ||
          rawNum === "" ||
          !Number.isInteger(pinNum) ||
          pinNum <= 0
        ) {
          errors.push(`Pin number at row ${i + 1} must be a positive integer.`);
        } else {
          if (pinNumbersSeen.has(pinNum)) {
            errors.push(
              `Duplicate pin number "${pinNum}" found at row ${i + 1}. Pin numbers must be unique within a part.`
            );
          }
          pinNumbersSeen.add(pinNum);
        }

        if (!pin.name || typeof pin.name !== "string" || !pin.name.trim()) {
          errors.push(`Pin name at row ${i + 1} cannot be empty.`);
        } else if (pin.name.trim().length > 50) {
          errors.push(`Pin name at row ${i + 1} cannot exceed 50 characters.`);
        }
      }
    }
  }

  // Specifications validation: non-empty names and non-empty values
  if (body.specifications !== undefined) {
    if (
      !body.specifications ||
      typeof body.specifications !== "object" ||
      Array.isArray(body.specifications)
    ) {
      errors.push("Specifications must be an object.");
    } else {
      for (const [key, value] of Object.entries(body.specifications)) {
        if (!key || typeof key !== "string" || !key.trim()) {
          errors.push("Specification names cannot be empty.");
        } else if (key.trim().length > 60) {
          errors.push(`Specification name "${key}" cannot exceed 60 characters.`);
        }

        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && !value.trim())
        ) {
          errors.push(`Specification value for "${key}" cannot be empty.`);
        } else if (typeof value === "string" && value.trim().length > 200) {
          errors.push(`Specification value for "${key}" cannot exceed 200 characters.`);
        }
      }
    }
  }

  // Package body dimensions validation: positive numbers
  if (body.package?.bodyDimensions) {
    const { lengthMm, widthMm } = body.package.bodyDimensions;

    if (lengthMm !== undefined && lengthMm !== null && lengthMm !== "") {
      const len = Number(lengthMm);
      if (isNaN(len) || len <= 0) {
        errors.push("Body length must be a positive number in mm.");
      } else if (len > 1000) {
        errors.push("Body length cannot exceed 1000 mm.");
      }
    }

    if (widthMm !== undefined && widthMm !== null && widthMm !== "") {
      const wid = Number(widthMm);
      if (isNaN(wid) || wid <= 0) {
        errors.push("Body width must be a positive number in mm.");
      } else if (wid > 1000) {
        errors.push("Body width cannot exceed 1000 mm.");
      }
    }
  }

  return errors;
}

// ============================================================================
// READ ROUTES (Public Catalogue Access)
// ============================================================================

// GET /api/components - List components with optional filtering
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      manufacturer,
      package: packageName,
      includeInactive,
    } = req.query;

    // Start with active components only, unless explicitly requested by an admin manage view
    const filter = {};
    if (includeInactive !== "true") {
      filter.isActive = true;
    }

    // Search by component name or part number
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");

      filter.$or = [{ name: searchRegex }, { partNumber: searchRegex }];
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by manufacturer
    if (manufacturer) {
      filter.manufacturer = new RegExp(escapeRegex(manufacturer), "i");
    }

    // Filter by package name
    if (packageName) {
      filter["package.name"] = new RegExp(escapeRegex(packageName), "i");
    }

    const components = await Component.find(filter).sort({
      name: 1,
    });

    res.json(components);
  } catch (error) {
    console.error("Error fetching components:", error.message);
    res.status(500).json({
      message: "Failed to fetch components",
    });
  }
});

// GET /api/components/:id - Fetch single component by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid component ID format.",
      });
    }

    const component = await Component.findById(id);
    if (!component) {
      return res.status(404).json({
        message: "Component not found.",
      });
    }

    res.json(component);
  } catch (error) {
    console.error("Error fetching component by ID:", error.message);
    res.status(500).json({
      message: "Failed to fetch component",
    });
  }
});

// ============================================================================
// WRITE ROUTES (Protected by requireAuth, then requireAdmin)
// ============================================================================

/**
 * VIVA EXPLANATION — 2. Why requireAdmin Comes After requireAuth:
 * Express executes middleware in strict pipeline sequence. In Role-Based Access Control (RBAC),
 * Authentication (verifying caller identity) MUST precede Authorization (verifying permissions).
 * `requireAuth` first extracts and validates the cryptographic JWT Bearer token, queries the
 * user record, and attaches `req.user`. `requireAdmin` then verifies that `req.user.role === "admin"`.
 * If `requireAdmin` were placed first, `req.user` would be undefined, causing premature failure.
 */

// POST /api/components - Create a new component (Admin only)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    // 1. Validate payload requirements and data types
    const validationErrors = validateComponentPayload(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: validationErrors.join(" "),
      });
    }

    const trimmedPartNumber = req.body.partNumber.trim();

    // 2. Enforce case-insensitive uniqueness check for partNumber before insert
    const existing = await Component.findOne({
      partNumber: { $regex: new RegExp(`^${escapeRegex(trimmedPartNumber)}$`, "i") },
    });

    if (existing) {
      return res.status(409).json({
        message: `A component with part number "${trimmedPartNumber}" already exists.`,
      });
    }

    // 3. Extract strictly whitelisted attributes (never trust raw request body)
    const whitelistedData = extractWhitelistedComponentFields(req.body, false);

    // 4. Save new component document
    const component = new Component(whitelistedData);
    const savedComponent = await component.save();

    // 5. Return 201 Created with saved document
    res.status(201).json(savedComponent);
  } catch (error) {
    // Handle MongoDB duplicate key index violation (error code 11000)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A component with this part number already exists.",
      });
    }

    // Handle Mongoose schema validation failure
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        message: messages.join(" ") || "Validation failed.",
      });
    }

    console.error("Error creating component:", error.message);
    res.status(500).json({
      message: "Failed to create component.",
    });
  }
});

// PUT /api/components/:id - Update an existing component (Admin only)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid component ID format.",
      });
    }

    // 2. Verify component exists
    const existingComponent = await Component.findById(id);
    if (!existingComponent) {
      return res.status(404).json({
        message: "Component not found.",
      });
    }

    // 3. Validate update payload
    const validationErrors = validateComponentPayload(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: validationErrors.join(" "),
      });
    }

    // 4. If partNumber is being updated, verify case-insensitive uniqueness against other components
    if (req.body.partNumber !== undefined) {
      const trimmedPartNumber = String(req.body.partNumber).trim();
      const duplicate = await Component.findOne({
        _id: { $ne: id },
        partNumber: {
          $regex: new RegExp(`^${escapeRegex(trimmedPartNumber)}$`, "i"),
        },
      });

      if (duplicate) {
        return res.status(409).json({
          message: `A component with part number "${trimmedPartNumber}" already exists.`,
        });
      }
    }

    // 5. Extract strictly whitelisted attributes for update
    const whitelistedUpdates = extractWhitelistedComponentFields(
      req.body,
      true
    );

    // Defensive Merge: If updating package metadata, preserve existing mechanical/layout properties
    if (whitelistedUpdates.package && existingComponent.package) {
      const existingPkg = existingComponent.package.toObject
        ? existingComponent.package.toObject()
        : existingComponent.package;
      whitelistedUpdates.package = {
        ...existingPkg,
        ...whitelistedUpdates.package,
        bodyDimensions: {
          ...(existingPkg.bodyDimensions || {}),
          ...(whitelistedUpdates.package.bodyDimensions || {}),
        },
        pcbLayout: {
          ...(existingPkg.pcbLayout || {}),
          ...(whitelistedUpdates.package.pcbLayout || {}),
        },
        footprintDimensions: {
          ...(existingPkg.footprintDimensions || {}),
          ...(whitelistedUpdates.package.footprintDimensions || {}),
        },
      };
    }

    // 6. Update document with runValidators enabled to enforce schema rules
    const updatedComponent = await Component.findByIdAndUpdate(
      id,
      { $set: whitelistedUpdates },
      { new: true, runValidators: true }
    );

    // 7. If imageUrl or datasheetUrl changed, clean up previous uploaded files from disk
    if (
      whitelistedUpdates.imageUrl !== undefined &&
      existingComponent.imageUrl &&
      existingComponent.imageUrl !== updatedComponent.imageUrl
    ) {
      safelyDeleteUploadedFile(existingComponent.imageUrl);
    }

    if (
      whitelistedUpdates.datasheetUrl !== undefined &&
      existingComponent.datasheetUrl &&
      existingComponent.datasheetUrl !== updatedComponent.datasheetUrl
    ) {
      safelyDeleteUploadedFile(existingComponent.datasheetUrl);
    }

    res.json(updatedComponent);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A component with this part number already exists.",
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        message: messages.join(" ") || "Validation failed.",
      });
    }

    console.error("Error updating component:", error.message);
    res.status(500).json({
      message: "Failed to update component.",
    });
  }
});

/**
 * VIVA EXPLANATION — 3. Why Delete Cleans Orphan References:
 * Unlike relational SQL databases with foreign keys and `ON DELETE CASCADE`, MongoDB does not
 * automatically remove references in related collections. If a `Component` document is deleted,
 * user bookmarks stored in `SavedPart` pointing to that `Component`'s `_id` become dangling/orphan
 * references. Subsequent queries calling `.populate("component")` would return `null` components,
 * producing runtime frontend errors. Cascading the deletion to remove referencing `SavedPart` records
 * guarantees referential integrity across the application.
 */
// DELETE /api/components/:id - Delete a component and clean referencing bookmarks (Admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid component ID format.",
      });
    }

    // 2. Verify component exists before deleting
    const component = await Component.findById(id);
    if (!component) {
      return res.status(404).json({
        message: "Component not found.",
      });
    }

    // 3. Remove all SavedPart bookmarks that reference this component to prevent orphan records
    const bookmarkCleanup = await SavedPart.deleteMany({ component: id });

    // 4. Delete the component itself
    await Component.findByIdAndDelete(id);

    // 5. Clean up any uploaded assets from disk
    safelyDeleteUploadedFile(component.imageUrl);
    safelyDeleteUploadedFile(component.datasheetUrl);

    res.json({
      message: "Component deleted successfully.",
      deletedId: id,
      removedBookmarksCount: bookmarkCleanup.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting component:", error.message);
    res.status(500).json({
      message: "Failed to delete component.",
    });
  }
});

module.exports = router;

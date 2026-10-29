const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Component = require("../models/Component");
const SavedPart = require("../models/SavedPart");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

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

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

// Deletes superseded upload from disk; path check prevents directory traversal
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
    }
  } catch (err) {
    console.error("Failed to delete unreferenced upload:", err.message);
  }
}

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

// Whitelist permitted schema attributes to prevent mass assignment (CWE-915)
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

function validateComponentPayload(body, isUpdate = false) {
  const errors = [];

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

    if (body.package?.mountingType) {
    const validMounting = ["Through-Hole", "Surface-Mount"];
    if (!validMounting.includes(body.package.mountingType)) {
      errors.push(
        "Mounting type must be either 'Through-Hole' or 'Surface-Mount'."
      );
    }
  }

    if (body.dataStatus) {
    if (!["verified", "incomplete"].includes(body.dataStatus)) {
      errors.push("dataStatus must be either 'verified' or 'incomplete'.");
    }
  }

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

router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      manufacturer,
      package: packageName,
      includeInactive,
    } = req.query;

        const filter = {};
    if (includeInactive !== "true") {
      filter.isActive = true;
    }

        if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");

      filter.$or = [{ name: searchRegex }, { partNumber: searchRegex }];
    }

        if (category) {
      filter.category = category;
    }

        if (manufacturer) {
      filter.manufacturer = new RegExp(escapeRegex(manufacturer), "i");
    }

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

// requireAuth must attach req.user before requireAdmin checks role
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
        const validationErrors = validateComponentPayload(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: validationErrors.join(" "),
      });
    }

    const trimmedPartNumber = req.body.partNumber.trim();

        const existing = await Component.findOne({
      partNumber: { $regex: new RegExp(`^${escapeRegex(trimmedPartNumber)}$`, "i") },
    });

    if (existing) {
      return res.status(409).json({
        message: `A component with part number "${trimmedPartNumber}" already exists.`,
      });
    }

        const whitelistedData = extractWhitelistedComponentFields(req.body, false);

        const component = new Component(whitelistedData);
    const savedComponent = await component.save();

        res.status(201).json(savedComponent);
  } catch (error) {
    // Handle MongoDB duplicate key index violation (error code 11000)
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

    console.error("Error creating component:", error.message);
    res.status(500).json({
      message: "Failed to create component.",
    });
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid component ID format.",
      });
    }

        const existingComponent = await Component.findById(id);
    if (!existingComponent) {
      return res.status(404).json({
        message: "Component not found.",
      });
    }

        const validationErrors = validateComponentPayload(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: validationErrors.join(" "),
      });
    }

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

        const updatedComponent = await Component.findByIdAndUpdate(
      id,
      { $set: whitelistedUpdates },
      { new: true, runValidators: true }
    );

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

// Cascades deletion to SavedPart to prevent orphan references in MongoDB
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
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

        const bookmarkCleanup = await SavedPart.deleteMany({ component: id });

        await Component.findByIdAndDelete(id);

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

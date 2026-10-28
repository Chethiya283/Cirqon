// File upload routes for component product photos and PDF datasheets.

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Define and ensure upload directories exist
const UPLOADS_ROOT = path.resolve(__dirname, "../uploads");
const IMAGES_DIR = path.join(UPLOADS_ROOT, "images");
const DATASHEETS_DIR = path.join(UPLOADS_ROOT, "datasheets");

fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(DATASHEETS_DIR, { recursive: true });

/**
 * VIVA EXPLANATION:
 * 1. Why Multer is Needed:
 *    Express only handles JSON and URL-encoded bodies natively; Multer is required to parse
 *    multipart/form-data streams and write uploaded binary files directly to disk.
 * 
 * 2. Why Random Filenames (UUID) are Used:
 *    Never use user-provided original filenames for stored file paths. Attackers can embed
 *    directory traversal sequences (e.g. "../../etc/cron"), execute extension-spoofing,
 *    or overwrite existing files. Generating a cryptographically random UUID (`crypto.randomUUID()`)
 *    with a sanitized, whitelist-verified extension prevents naming collisions and path traversal.
 * 
 * 3. Why Validate Real MIME Types & Magic Bytes (Content Inspection):
 *    Checking only file extensions is trivial to bypass (e.g. renaming an executable or PHP script
 *    to .jpg). Inspecting both the HTTP Content-Type header and the underlying file header
 *    signatures (magic bytes: FF D8 FF for JPEG, 89 50 4E 47 for PNG, RIFF...WEBP for WebP,
 *    and %PDF- for PDF) ensures malicious or corrupted payloads are rejected at the gate.
 */

// Storage configuration with random UUID naming
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
      ? ext === ".jpeg"
        ? ".jpg"
        : ext
      : ".png";
    const uniqueName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  },
});

const datasheetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DATASHEETS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}.pdf`;
    cb(null, uniqueName);
  },
});

// File filter for images (JPG, PNG, WebP)
function imageFileFilter(req, file, cb) {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  if (!allowedExtensions.includes(ext) || !allowedMimes.includes(mime)) {
    const err = new Error(
      "Invalid image format. Only JPG, PNG, and WebP image files are allowed."
    );
    err.code = "INVALID_IMAGE_FORMAT";
    return cb(err, false);
  }

  cb(null, true);
}

// File filter for datasheets (PDF only)
function datasheetFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  if (ext !== ".pdf" || (mime !== "application/pdf" && mime !== "application/x-pdf")) {
    const err = new Error("Invalid datasheet format. Only PDF files are allowed.");
    err.code = "INVALID_DATASHEET_FORMAT";
    return cb(err, false);
  }

  cb(null, true);
}

// Multer instances with strict file size limits
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: imageFileFilter,
}).single("file");

const uploadDatasheet = multer({
  storage: datasheetStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: datasheetFileFilter,
}).single("file");

/**
 * Validates the file header magic bytes to prevent renamed non-image/non-pdf files from succeeding.
 */
function verifyFileSignature(filePath, expectedCategory) {
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);

    if (bytesRead < 4) return false;

    if (expectedCategory === "image") {
      // JPEG: FF D8 FF
      const isJpeg =
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      // PNG: 89 50 4E 47
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      // WebP: RIFF ... WEBP
      const isWebp =
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        bytesRead >= 12 &&
        buffer.toString("ascii", 8, 12) === "WEBP";

      return isJpeg || isPng || isWebp;
    }

    if (expectedCategory === "datasheet") {
      // PDF: %PDF- (25 50 44 46 2D)
      return buffer.toString("ascii", 0, 5) === "%PDF-";
    }

    return false;
  } catch (err) {
    console.error("Error inspecting file signature:", err.message);
    return false;
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

/**
 * POST /api/uploads/image
 * Accepts multipart/form-data with field "file".
 * Max 2 MB, JPG/PNG/WebP only.
 */
router.post("/image", requireAuth, requireAdmin, (req, res) => {
  uploadImage(req, res, (err) => {
    // 1. Handle Multer-specific errors
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "File too large. Maximum image size is 2 MB.",
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          message: "Unexpected field name. Expected 'file'.",
        });
      }
      return res.status(400).json({
        message: err.message || "Failed to process image upload.",
      });
    }

    // 2. Verify file was provided
    if (!req.file) {
      return res.status(400).json({
        message: "No image file provided. Please choose a file to upload.",
      });
    }

    // 3. Inspect real magic bytes on disk
    const isValidSignature = verifyFileSignature(req.file.path, "image");
    if (!isValidSignature) {
      // Unlink spoofed or malformed file immediately
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error("Cleanup error after rejected upload:", cleanupErr.message);
      }
      return res.status(400).json({
        message:
          "Invalid file content. File does not match real JPG, PNG, or WebP image format.",
      });
    }

    // 4. Return relative upload URL
    const url = `/uploads/images/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

/**
 * POST /api/uploads/datasheet
 * Accepts multipart/form-data with field "file".
 * Max 10 MB, PDF only.
 */
router.post("/datasheet", requireAuth, requireAdmin, (req, res) => {
  uploadDatasheet(req, res, (err) => {
    // 1. Handle Multer-specific errors
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "File too large. Maximum datasheet size is 10 MB.",
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          message: "Unexpected field name. Expected 'file'.",
        });
      }
      return res.status(400).json({
        message: err.message || "Failed to process datasheet upload.",
      });
    }

    // 2. Verify file was provided
    if (!req.file) {
      return res.status(400).json({
        message: "No datasheet file provided. Please choose a file to upload.",
      });
    }

    // 3. Inspect real magic bytes on disk
    const isValidSignature = verifyFileSignature(req.file.path, "datasheet");
    if (!isValidSignature) {
      // Unlink spoofed or malformed file immediately
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error("Cleanup error after rejected upload:", cleanupErr.message);
      }
      return res.status(400).json({
        message:
          "Invalid file content. File does not match real PDF document format.",
      });
    }

    // 4. Return relative upload URL
    const url = `/uploads/datasheets/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

module.exports = router;


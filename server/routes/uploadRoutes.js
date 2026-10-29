
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

const UPLOADS_ROOT = path.resolve(__dirname, "../uploads");
const IMAGES_DIR = path.join(UPLOADS_ROOT, "images");
const DATASHEETS_DIR = path.join(UPLOADS_ROOT, "datasheets");

fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(DATASHEETS_DIR, { recursive: true });

// Random UUIDs and magic byte validation prevent path traversal and extension spoofing
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

router.post("/image", requireAuth, requireAdmin, (req, res) => {
  uploadImage(req, res, (err) => {
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

        if (!req.file) {
      return res.status(400).json({
        message: "No image file provided. Please choose a file to upload.",
      });
    }

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

        const url = `/uploads/images/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

router.post("/datasheet", requireAuth, requireAdmin, (req, res) => {
  uploadDatasheet(req, res, (err) => {
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

        if (!req.file) {
      return res.status(400).json({
        message: "No datasheet file provided. Please choose a file to upload.",
      });
    }

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

        const url = `/uploads/datasheets/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

module.exports = router;


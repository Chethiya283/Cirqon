const express = require("express");
const mongoose = require("mongoose");
const SavedPart = require("../models/SavedPart");
const Component = require("../models/Component");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(requireAuth);

// Queries saved parts scoped to req.user._id (anti-IDOR) and populates component details
router.get("/", async (req, res) => {
  try {
    const savedParts = await SavedPart.find({ user: req.user._id })
      .populate("component")
      .sort({ createdAt: -1 });

    // Exclude hidden/inactive parts from user workspaces and counts
    const activeSavedParts = savedParts.filter(
      (item) => item.component && item.component.isActive !== false
    );

    res.json(activeSavedParts);
  } catch (error) {
    console.error("Error fetching saved parts:", error.message);
    res.status(500).json({
      message: "Failed to fetch saved components.",
    });
  }
});

// Bookmarks a component for req.user._id; unique compound index prevents duplicates
router.post("/", async (req, res) => {
  try {
    const { componentId } = req.body;
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      return res.status(400).json({
        message: "A valid component ID is required.",
      });
    }
    const componentExists = await Component.findById(componentId);
    if (!componentExists || componentExists.isActive === false) {
      return res.status(404).json({
        message: "Component not found in catalog.",
      });
    }
    const existing = await SavedPart.findOne({
      user: req.user._id,
      component: componentId,
    });
    if (existing) {
      return res.status(409).json({
        message: "This component is already saved in your workspace.",
      });
    }
    const savedPart = new SavedPart({
      user: req.user._id, // Strictly derived from authenticated token
      component: componentId,
    });

    await savedPart.save();
    await savedPart.populate("component");

    res.status(201).json({
      message: "Component saved to workspace.",
      savedPart,
    });
  } catch (error) {
    // Handle unique compound index violation (E11000)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This component is already saved in your workspace.",
      });
    }

    console.error("Error saving component:", error.message);
    res.status(500).json({
      message: "Server error occurred while saving component.",
    });
  }
});

// Updates quantity and notes scoped strictly to req.user._id
router.put("/:componentId", async (req, res) => {
  try {
    const { componentId } = req.params;
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      return res.status(400).json({
        message: "A valid component ID is required.",
      });
    }
    const { quantity, note } = req.body;
    const updateFields = {};

    if (quantity !== undefined) {
      if (
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 10000
      ) {
        return res.status(400).json({
          message: "Quantity must be an integer between 1 and 10,000.",
        });
      }
      updateFields.quantity = quantity;
    }

    if (note !== undefined) {
      if (typeof note !== "string") {
        return res.status(400).json({
          message: "Note must be a text string.",
        });
      }
      const trimmedNote = note.trim();
      if (trimmedNote.length > 300) {
        return res.status(400).json({
          message: "Note cannot exceed 300 characters.",
        });
      }
      updateFields.note = trimmedNote;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        message: "At least one valid field (quantity or note) must be provided to update.",
      });
    }
    const updated = await SavedPart.findOneAndUpdate(
      { user: req.user._id, component: componentId },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate("component");

    if (!updated) {
      return res.status(404).json({
        message: "Saved component entry not found.",
      });
    }

    res.json({
      message: "Saved part updated successfully.",
      savedPart: updated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Error updating saved component:", error.message);
    res.status(500).json({
      message: "Server error occurred while updating saved component.",
    });
  }
});

// Removes saved part scoped strictly to req.user._id
router.delete("/:componentId", async (req, res) => {
  try {
    const { componentId } = req.params;
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      return res.status(400).json({
        message: "A valid component ID is required.",
      });
    }
    const deletedEntry = await SavedPart.findOneAndDelete({
      user: req.user._id,
      component: componentId,
    });

    if (!deletedEntry) {
      return res.status(404).json({
        message: "Saved component entry not found.",
      });
    }

    res.json({
      message: "Component removed from saved list.",
    });
  } catch (error) {
    console.error("Error removing saved component:", error.message);
    res.status(500).json({
      message: "Server error occurred while removing saved component.",
    });
  }
});

module.exports = router;


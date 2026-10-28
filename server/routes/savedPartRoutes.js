const express = require("express");
const mongoose = require("mongoose");
const SavedPart = require("../models/SavedPart");
const Component = require("../models/Component");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Apply requireAuth to all saved-parts routes
router.use(requireAuth);

/**
 * GET /api/saved-parts
 * 
 * Retrieve all components bookmarked by the currently authenticated engineer.
 * 
 * VIVA EXPLANATION:
 * 1. Population (.populate):
 *    In MongoDB, documents reference each other via ObjectId. Calling `.populate("component")`
 *    instructs Mongoose to query the `Component` collection and inject the full component
 *    object into the `component` field of each returned `SavedPart` document.
 * 2. Identity Security (Anti-IDOR):
 *    The query filter is strictly `{ user: req.user._id }`. The user ID is retrieved
 *    from the verified JWT attached by `requireAuth`, preventing Insecure Direct Object
 *    References (IDOR) where a client could view another user's saved parts.
 * 3. Chronological Ordering:
 *    `.sort({ createdAt: -1 })` returns the most recently bookmarked components first.
 */
router.get("/", async (req, res) => {
  try {
    const savedParts = await SavedPart.find({ user: req.user._id })
      .populate("component")
      .sort({ createdAt: -1 });

    res.json(savedParts);
  } catch (error) {
    console.error("Error fetching saved parts:", error.message);
    res.status(500).json({
      message: "Failed to fetch saved components.",
    });
  }
});

/**
 * POST /api/saved-parts
 * 
 * Bookmark an electronic component to the user's workspace.
 * Request body: { componentId }
 * 
 * VIVA EXPLANATION:
 * 1. Token-Derived Identity:
 *    The `user` field is populated exclusively from `req.user._id`. The client is NEVER
 *    allowed to pass a `userId` in the body, ensuring an attacker cannot inject bookmarks
 *    into other engineers' accounts.
 * 2. Defensive Validation:
 *    Validates that `componentId` is a 24-character hex MongoDB ObjectId and that the
 *    referenced component exists in the database (returning 404 if nonexistent).
 * 3. Duplicate Prevention:
 *    Checks if the part is already bookmarked by this user, returning HTTP 409 Conflict.
 */
router.post("/", async (req, res) => {
  try {
    const { componentId } = req.body;

    // 1. Validate ObjectId format
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      return res.status(400).json({
        message: "A valid component ID is required.",
      });
    }

    // 2. Verify component exists in database
    const componentExists = await Component.findById(componentId);
    if (!componentExists) {
      return res.status(404).json({
        message: "Component not found in catalog.",
      });
    }

    // 3. Check for existing bookmark
    const existing = await SavedPart.findOne({
      user: req.user._id,
      component: componentId,
    });
    if (existing) {
      return res.status(409).json({
        message: "This component is already saved in your workspace.",
      });
    }

    // 4. Save new bookmark entry
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

/**
 * PUT /api/saved-parts/:componentId
 * 
 * Update engineering metadata (quantity and design note) for a bookmarked component.
 * Request body: { quantity?, note? }
 * 
 * VIVA EXPLANATION:
 * 1. Strict Whitelisting (Anti-Mass Assignment):
 *    Only `quantity` and `note` are extracted from `req.body`. Even if a malicious client sends
 *    `{ user: "attackerId", component: "otherId", role: "admin" }`, those fields are ignored,
 *    preventing mass assignment vulnerabilities.
 * 2. Identity Security (Anti-IDOR / Anti-BOLA):
 *    The query filter is locked to `{ user: req.user._id, component: componentId }`.
 *    The `user` identifier comes strictly from the verified JWT payload attached by `requireAuth`,
 *    never from request headers or body. This ensures engineers can never read or mutate
 *    another user's workspace items.
 * 3. Schema Validation Enforcement (runValidators):
 *    Mongoose skips schema validation on `findOneAndUpdate` by default. Passing
 *    `{ runValidators: true }` ensures the database engine enforces schema-level constraints.
 */
router.put("/:componentId", async (req, res) => {
  try {
    const { componentId } = req.params;

    // 1. Validate ObjectId format
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      return res.status(400).json({
        message: "A valid component ID is required.",
      });
    }

    // 2. Strict Whitelisting & Validation
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

    // 3. Atomically update document scoped strictly to authenticated user
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

/**
 * DELETE /api/saved-parts/:componentId
 * 
 * Remove a component from the authenticated user's saved list.
 * 
 * VIVA EXPLANATION:
 * The query targets `{ user: req.user._id, component: req.params.componentId }`.
 * Users can ONLY delete their own bookmarks; even if an attacker guesses another user's
 * bookmark ID, they cannot delete it because the query is locked to `req.user._id`.
 */
router.delete("/:componentId", async (req, res) => {
  try {
    const { componentId } = req.params;

    // 1. Validate ObjectId format
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      return res.status(400).json({
        message: "A valid component ID is required.",
      });
    }

    // 2. Remove bookmark scoped strictly to current user
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


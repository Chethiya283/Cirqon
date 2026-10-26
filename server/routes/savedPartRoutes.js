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



const express = require("express");
const Component = require("../models/Component");

const router = express.Router();

// GET /api/components
router.get("/", async (req, res) => {
  try {
    const { search, category, manufacturer, package: packageName } =
      req.query;

    // Start with active components only
    const filter = { isActive: true };

    // Search by component name or part number
    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { name: searchRegex },
        { partNumber: searchRegex },
      ];
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by manufacturer
    if (manufacturer) {
      filter.manufacturer = new RegExp(
        manufacturer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
    }

    // Filter by package name
    if (packageName) {
      filter["package.name"] = new RegExp(
        packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
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

module.exports = router;

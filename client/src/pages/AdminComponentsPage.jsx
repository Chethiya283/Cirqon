// Administrative CRUD management view for electronic components.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  FileText,
  Search,
  Copy,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ComponentThumbnail } from "../ComponentImage";
import { resolveAssetUrl } from "../utils/formatters";
import "./AdminComponentsPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const CATEGORIES = [
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

const PAGE_SIZE = 10;

/**
 * Validates external HTTP/HTTPS URLs or uploaded asset paths starting with /uploads/.
 */
function isValidHttpUrl(urlString) {
  const trimmed = urlString.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/uploads/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates component image URLs, supporting external HTTP(S), local /images/..., and /uploads/ paths.
 */
function isValidImageUrl(urlString) {
  const trimmed = urlString.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/") || trimmed.startsWith("/uploads/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Formats an ISO date string into human-readable format.
 */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Decomposes a component's specifications map/object into editable rows:
 * [{ name, value, unit }]
 */
function parseSpecsToRows(specs) {
  if (!specs || typeof specs !== "object") return [];
  const entries = specs instanceof Map ? Array.from(specs.entries()) : Object.entries(specs);
  const rows = [];
  const pairedUnitKeys = new Set();
  const obj = specs instanceof Map ? Object.fromEntries(specs) : specs;

  for (const [key, val] of entries) {
    if (key.endsWith("Unit")) continue;
    const unitKey = `${key}Unit`;
    let unit = "";
    let value = val;

    if (obj[unitKey] !== undefined) {
      unit = String(obj[unitKey]);
      pairedUnitKeys.add(unitKey);
    } else if (typeof val === "object" && val !== null && val.value !== undefined) {
      unit = val.unit || "";
      value = val.value;
    }

    rows.push({
      name: key,
      value: value != null ? String(value) : "",
      unit,
    });
  }

  // Handle any stray unit keys not attached to a base key
  for (const [key, val] of entries) {
    if (key.endsWith("Unit") && !pairedUnitKeys.has(key)) {
      rows.push({
        name: key,
        value: val != null ? String(val) : "",
        unit: "",
      });
    }
  }

  return rows;
}

/**
 * Creates default empty form state.
 */
function createEmptyFormValues() {
  return {
    partNumber: "",
    name: "",
    manufacturer: "",
    category: "",
    packageName: "",
    bodyLengthMm: "",
    bodyWidthMm: "",
    description: "",
    imageUrl: "",
    datasheetUrl: "",
    manufacturerUrl: "",
    pins: [],
    specifications: [],
  };
}

export const AdminComponentsPage = () => {
  const { token } = useAuth();
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Operational feedback banner state
  const [feedbackBanner, setFeedbackBanner] = useState(null);

  // Table filter, sort, and pagination state
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortField, setSortField] = useState("partNumber");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Form modal state (used for Add, Edit, Duplicate)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [preservedPackageData, setPreservedPackageData] = useState(null);
  const [formValues, setFormValues] = useState(createEmptyFormValues);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // File upload state for image
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [imageFileChosenName, setImageFileChosenName] = useState(null);

  // File upload state for datasheet
  const [isUploadingDatasheet, setIsUploadingDatasheet] = useState(false);
  const [datasheetUploadError, setDatasheetUploadError] = useState(null);
  const [datasheetFileChosenName, setDatasheetFileChosenName] = useState(null);

  // Delete confirmation dialog state
  const [deletingComponent, setDeletingComponent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Trigger state to refresh the component list without full page reload
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /**
   * VIVA EXPLANATION:
   * 1. Accessible Compound Action Menu Pattern:
   *    - Replaces unwieldy multi-button table columns with a primary "Edit" call-to-action
   *      accompanied by a compact "More" (three-dot) overflow trigger.
   *    - Uses React's `createPortal` to render the dropdown menu directly onto `document.body`
   *      with calculated fixed coordinates, strictly preventing clipping by table scroll containers.
   *    - Fully adheres to WAI-ARIA Menu semantics: ArrowUp/ArrowDown navigation, Escape dismissal,
   *      auto-focus on open, and seamless focus restoration to the trigger button on close.
   * 2. Row-Level Click-to-Inspect Affinity:
   *    - Makes table rows accessible interactive elements (role="button", tabIndex=0, Enter/Space activation)
   *      while using event delegation to ignore clicks originating from nested actionable buttons.
   */
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);

  const handleOpenMoreMenu = (e, comp) => {
    e.stopPropagation();
    if (activeMenu?.component?._id === comp._id) {
      setActiveMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveMenu({
      component: comp,
      anchorRect: rect,
      triggerEl: e.currentTarget,
    });
  };

  const handleCloseMoreMenu = () => {
    if (activeMenu?.triggerEl) {
      activeMenu.triggerEl.focus();
    }
    setActiveMenu(null);
  };

  // Close More menu on outside click, window resize, or scroll
  useEffect(() => {
    if (!activeMenu) return;

    const handlePointerDown = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !activeMenu.triggerEl.contains(e.target)
      ) {
        setActiveMenu(null);
      }
    };

    const handleWindowChange = () => {
      setActiveMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleWindowChange, true);
    window.addEventListener("resize", handleWindowChange);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleWindowChange, true);
      window.removeEventListener("resize", handleWindowChange);
    };
  }, [activeMenu]);

  // Keyboard accessibility inside the open More menu
  useEffect(() => {
    if (!activeMenu || !menuRef.current) return;
    const items = menuRef.current.querySelectorAll("button[role='menuitem']");
    if (items.length > 0) {
      items[0].focus();
    }
  }, [activeMenu]);

  const handleMenuKeyDown = (e) => {
    if (!menuRef.current) return;
    const items = Array.from(
      menuRef.current.querySelectorAll("button[role='menuitem']:not(:disabled)")
    );
    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleCloseMoreMenu();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
    } else if (e.key === "Tab") {
      setActiveMenu(null);
    }
  };

  // Row click to edit handler (skips when clicking inside interactive controls)
  const handleRowClick = (e, comp) => {
    if (e.target.closest("button, a, input, select, [role='menu'], [role='menuitem']")) {
      return;
    }
    handleOpenEditModal(comp);
  };

  const handleRowKeyDown = (e, comp) => {
    if (e.target.closest("button, a, input, select, [role='menu'], [role='menuitem']")) {
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpenEditModal(comp);
    }
  };

  // Detect whether form has unsaved modifications
  const isDirty = useMemo(() => {
    if (!isFormOpen) return false;
    return JSON.stringify(formValues) !== initialSnapshot;
  }, [isFormOpen, formValues, initialSnapshot]);

  // Window beforeunload prompt when modal has unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isFormOpen && isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormOpen, isDirty]);

  // Fetch all components (including inactive ones) from catalogue
  useEffect(() => {
    let cancelled = false;
    async function loadComponents() {
      try {
        const res = await fetch(`${API_BASE_URL}/components?includeInactive=true`);
        if (!res.ok) {
          throw new Error(`Failed to load components: HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setComponents(data);
          setFetchError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
                ? "Unable to connect to the backend server. Please verify that the backend is running on port 5000."
                : err.message
              : "Failed to load components.";
          setFetchError(msg);
          setLoading(false);
        }
      }
    }
    loadComponents();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const refreshList = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Client-side filtering and sorting
  const filteredAndSortedComponents = useMemo(() => {
    let result = [...components];

    // Filter by search query (partNumber, name, manufacturer)
    if (adminSearchQuery.trim()) {
      const q = adminSearchQuery.trim().toLowerCase();
      result = result.filter(
        (comp) =>
          (comp.partNumber || "").toLowerCase().includes(q) ||
          (comp.name || "").toLowerCase().includes(q) ||
          (comp.manufacturer || "").toLowerCase().includes(q)
      );
    }

    // Filter by category dropdown
    if (selectedCategory && selectedCategory !== "All") {
      result = result.filter((comp) => comp.category === selectedCategory);
    }

    // Sort by selected column
    result.sort((a, b) => {
      const comparison =
        sortField === "updatedAt"
          ? new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
          : (a[sortField] || "")
              .toString()
              .toLowerCase()
              .localeCompare((b[sortField] || "").toString().toLowerCase());
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [components, adminSearchQuery, selectedCategory, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = filteredAndSortedComponents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedComponents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedComponents.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedComponents, currentPage]);

  const handleSort = (field) => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleClearFilters = () => {
    setAdminSearchQuery("");
    setSelectedCategory("All");
    setCurrentPage(1);
  };

  // Open modal in "Create" mode
  const handleOpenAddModal = () => {
    const empty = createEmptyFormValues();
    setEditingComponent(null);
    setPreservedPackageData(null);
    setFormValues(empty);
    setInitialSnapshot(JSON.stringify(empty));
    setFormErrors({});
    setServerError(null);
    setImageUploadError(null);
    setImageFileChosenName(null);
    setDatasheetUploadError(null);
    setDatasheetFileChosenName(null);
    setIsFormOpen(true);
  };

  // Open modal in "Edit" mode with pre-filled values
  const handleOpenEditModal = (component) => {
    const loaded = {
      partNumber: component.partNumber || "",
      name: component.name || "",
      manufacturer: component.manufacturer || "",
      category: component.category || "",
      packageName: component.package?.name || "",
      bodyLengthMm:
        component.package?.bodyDimensions?.lengthMm != null
          ? String(component.package.bodyDimensions.lengthMm)
          : "",
      bodyWidthMm:
        component.package?.bodyDimensions?.widthMm != null
          ? String(component.package.bodyDimensions.widthMm)
          : "",
      description: component.description || "",
      imageUrl: component.imageUrl || "",
      datasheetUrl: component.datasheetUrl || "",
      manufacturerUrl: component.manufacturerUrl || "",
      pins: Array.isArray(component.pins)
        ? component.pins.map((p) => ({
            number: p.number != null ? String(p.number) : "",
            name: p.name || "",
            function: p.function || "",
          }))
        : [],
      specifications: parseSpecsToRows(component.specifications),
    };
    setEditingComponent(component);
    setPreservedPackageData(component.package || null);
    setFormValues(loaded);
    setInitialSnapshot(JSON.stringify(loaded));
    setFormErrors({});
    setServerError(null);
    setImageUploadError(null);
    setImageFileChosenName(null);
    setDatasheetUploadError(null);
    setDatasheetFileChosenName(null);
    setIsFormOpen(true);
  };

  // Open modal in "Duplicate" mode pre-filled with existing component, empty part number
  const handleOpenDuplicateModal = (component) => {
    const duplicated = {
      partNumber: "", // Empty to require unique part number
      name: component.name || "",
      manufacturer: component.manufacturer || "",
      category: component.category || "",
      packageName: component.package?.name || "",
      bodyLengthMm:
        component.package?.bodyDimensions?.lengthMm != null
          ? String(component.package.bodyDimensions.lengthMm)
          : "",
      bodyWidthMm:
        component.package?.bodyDimensions?.widthMm != null
          ? String(component.package.bodyDimensions.widthMm)
          : "",
      description: component.description || "",
      imageUrl: component.imageUrl || "",
      datasheetUrl: component.datasheetUrl || "",
      manufacturerUrl: component.manufacturerUrl || "",
      pins: Array.isArray(component.pins)
        ? component.pins.map((p) => ({
            number: p.number != null ? String(p.number) : "",
            name: p.name || "",
            function: p.function || "",
          }))
        : [],
      specifications: parseSpecsToRows(component.specifications),
    };
    setEditingComponent(null); // Submits as new POST
    setPreservedPackageData(component.package || null);
    setFormValues(duplicated);
    setInitialSnapshot(JSON.stringify(duplicated));
    setFormErrors({});
    setServerError(null);
    setImageUploadError(null);
    setImageFileChosenName(null);
    setDatasheetUploadError(null);
    setDatasheetFileChosenName(null);
    setIsFormOpen(true);
  };

  // Close form modal with unsaved changes confirmation
  const handleCloseFormModal = () => {
    if (isSaving || isUploadingImage || isUploadingDatasheet) return;
    if (isDirty) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes. Are you sure you want to discard them?"
      );
      if (!confirmDiscard) return;
    }
    setIsFormOpen(false);
    setEditingComponent(null);
    setPreservedPackageData(null);
    setFormErrors({});
    setServerError(null);
    setImageUploadError(null);
    setImageFileChosenName(null);
    setDatasheetUploadError(null);
    setDatasheetFileChosenName(null);
  };

  // Toggle isActive status directly from table row
  const handleToggleActive = async (comp) => {
    const newStatus = comp.isActive === false ? true : false;
    try {
      const res = await fetch(`${API_BASE_URL}/components/${comp._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Failed to update component status: HTTP ${res.status}`);
      }
      setFeedbackBanner({
        type: "success",
        message: `Component "${comp.partNumber}" is now ${newStatus ? "active" : "hidden"}.`,
      });
      refreshList();
    } catch (err) {
      setFeedbackBanner({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update component status.",
      });
    }
  };

  // Pin row handlers
  const handleAddPin = () => {
    setFormValues((prev) => ({
      ...prev,
      pins: [...prev.pins, { number: "", name: "", function: "" }],
    }));
  };

  const handleRemovePin = (index) => {
    setFormValues((prev) => ({
      ...prev,
      pins: prev.pins.filter((_, i) => i !== index),
    }));
  };

  const handlePinChange = (index, field, value) => {
    setFormValues((prev) => {
      const newPins = [...prev.pins];
      newPins[index] = { ...newPins[index], [field]: value };
      return { ...prev, pins: newPins };
    });
    if (formErrors.pins) {
      setFormErrors((prev) => ({ ...prev, pins: undefined }));
    }
  };

  // Specification row handlers
  const handleAddSpec = () => {
    setFormValues((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { name: "", value: "", unit: "" }],
    }));
  };

  const handleRemoveSpec = (index) => {
    setFormValues((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  const handleSpecChange = (index, field, value) => {
    setFormValues((prev) => {
      const newSpecs = [...prev.specifications];
      newSpecs[index] = { ...newSpecs[index], [field]: value };
      return { ...prev, specifications: newSpecs };
    });
    if (formErrors.specifications) {
      setFormErrors((prev) => ({ ...prev, specifications: undefined }));
    }
  };

  // Client-side image file upload handler
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploadError(null);
    if (file.size > 2 * 1024 * 1024) {
      setImageUploadError("Image file too large. Maximum size is 2 MB.");
      e.target.value = "";
      return;
    }
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedExts.includes(ext) && !allowedTypes.includes(file.type)) {
      setImageUploadError("Invalid image type. Only JPG, PNG, and WebP files are allowed.");
      e.target.value = "";
      return;
    }
    setImageFileChosenName(file.name);
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/uploads/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Upload failed: HTTP ${res.status}`);
      }
      setFormValues((prev) => ({ ...prev, imageUrl: data.url }));
      if (formErrors.imageUrl) {
        setFormErrors((prev) => ({ ...prev, imageUrl: undefined }));
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
            ? "Unable to connect to upload server. Please verify that the backend is running."
            : err.message
          : "Failed to upload image.";
      setImageUploadError(msg);
      setImageFileChosenName(null);
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  // Client-side datasheet file upload handler
  const handleDatasheetFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDatasheetUploadError(null);
    if (file.size > 10 * 1024 * 1024) {
      setDatasheetUploadError("Datasheet file too large. Maximum size is 10 MB.");
      e.target.value = "";
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".pdf" && file.type !== "application/pdf") {
      setDatasheetUploadError("Invalid document type. Only PDF files are allowed for datasheets.");
      e.target.value = "";
      return;
    }
    setDatasheetFileChosenName(file.name);
    setIsUploadingDatasheet(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/uploads/datasheet`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Upload failed: HTTP ${res.status}`);
      }
      setFormValues((prev) => ({ ...prev, datasheetUrl: data.url }));
      if (formErrors.datasheetUrl) {
        setFormErrors((prev) => ({ ...prev, datasheetUrl: undefined }));
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
            ? "Unable to connect to upload server. Please verify that the backend is running."
            : err.message
          : "Failed to upload datasheet.";
      setDatasheetUploadError(msg);
      setDatasheetFileChosenName(null);
    } finally {
      setIsUploadingDatasheet(false);
      e.target.value = "";
    }
  };

  // Client-side validation mirroring server validation
  const validateForm = () => {
    const errors = {};
    if (!formValues.partNumber.trim()) {
      errors.partNumber = "Part number is required.";
    }
    if (!formValues.name.trim()) {
      errors.name = "Component name is required.";
    }
    if (!formValues.manufacturer.trim()) {
      errors.manufacturer = "Manufacturer is required.";
    }
    if (!formValues.category.trim()) {
      errors.category = "Category is required.";
    } else if (!CATEGORIES.includes(formValues.category)) {
      errors.category = "Please select a valid category from the list.";
    }
    if (formValues.datasheetUrl && !isValidHttpUrl(formValues.datasheetUrl)) {
      errors.datasheetUrl =
        "Datasheet URL must be a valid HTTP or HTTPS address, or an uploaded /uploads/ path.";
    }
    if (formValues.manufacturerUrl && !isValidHttpUrl(formValues.manufacturerUrl)) {
      errors.manufacturerUrl = "Manufacturer URL must be a valid HTTP or HTTPS address.";
    }
    if (formValues.imageUrl && !isValidImageUrl(formValues.imageUrl)) {
      errors.imageUrl =
        "Image URL must be a valid HTTP, HTTPS, or relative image path (e.g. /images/... or /uploads/...).";
    }

    // Validate body dimensions if entered
    if (formValues.bodyLengthMm.trim() !== "") {
      const len = Number(formValues.bodyLengthMm);
      if (isNaN(len) || len <= 0 || len > 1000) {
        errors.bodyLengthMm = "Length must be a positive number in mm (max 1000 mm).";
      }
    }
    if (formValues.bodyWidthMm.trim() !== "") {
      const wid = Number(formValues.bodyWidthMm);
      if (isNaN(wid) || wid <= 0 || wid > 1000) {
        errors.bodyWidthMm = "Width must be a positive number in mm (max 1000 mm).";
      }
    }

    // Validate pins
    const seenPinNumbers = new Set();
    for (let i = 0; i < formValues.pins.length; i++) {
      const pin = formValues.pins[i];
      const numStr = (pin.number || "").toString().trim();
      const nameStr = (pin.name || "").trim();

      // Skip row if completely empty
      if (!numStr && !nameStr) continue;

      if (!numStr) {
        errors.pins = `Pin row #${i + 1} requires a pin number.`;
        break;
      }
      const numVal = parseInt(numStr, 10);
      if (!/^\d+$/.test(numStr) || numVal <= 0) {
        errors.pins = `Pin number in row #${i + 1} must be a positive integer.`;
        break;
      }
      if (seenPinNumbers.has(numVal)) {
        errors.pins = `Duplicate pin number "${numVal}" in pin definitions. Pin numbers must be unique.`;
        break;
      }
      seenPinNumbers.add(numVal);

      if (!nameStr) {
        errors.pins = `Pin row #${i + 1} requires a pin name.`;
        break;
      }
      if (nameStr.length > 50) {
        errors.pins = `Pin name in row #${i + 1} cannot exceed 50 characters.`;
        break;
      }
    }

    // Validate specifications
    for (let i = 0; i < formValues.specifications.length; i++) {
      const spec = formValues.specifications[i];
      const nameStr = (spec.name || "").trim();
      const valStr = (spec.value || "").trim();

      // Skip row if completely empty
      if (!nameStr && !valStr && !(spec.unit || "").trim()) continue;

      if (!nameStr) {
        errors.specifications = `Specification row #${i + 1} requires a name.`;
        break;
      }
      if (nameStr.length > 60) {
        errors.specifications = `Specification name in row #${i + 1} cannot exceed 60 characters.`;
        break;
      }
      if (!valStr) {
        errors.specifications = `Specification row #${i + 1} ("${nameStr}") requires a value.`;
        break;
      }
      if (valStr.length > 200) {
        errors.specifications = `Specification value in row #${i + 1} cannot exceed 200 characters.`;
        break;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submit handler for Create / Edit / Duplicate
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    setServerError(null);
    const isEdit = Boolean(editingComponent);

    // Build base payload
    const payload = {
      partNumber: formValues.partNumber.trim(),
      name: formValues.name.trim(),
      manufacturer: formValues.manufacturer.trim(),
      category: formValues.category.trim(),
    };

    if (isEdit) {
      payload.description = formValues.description.trim();
      payload.imageUrl = formValues.imageUrl.trim();
      payload.datasheetUrl = formValues.datasheetUrl.trim();
      payload.manufacturerUrl = formValues.manufacturerUrl.trim();
    } else {
      if (formValues.description.trim()) payload.description = formValues.description.trim();
      if (formValues.imageUrl.trim()) payload.imageUrl = formValues.imageUrl.trim();
      if (formValues.datasheetUrl.trim()) payload.datasheetUrl = formValues.datasheetUrl.trim();
      if (formValues.manufacturerUrl.trim())
        payload.manufacturerUrl = formValues.manufacturerUrl.trim();
    }

    // Preserve non-edited package geometry (e.g. heightMm, seatedHeightMm, pcbLayout, mountingType)
    const basePkg = (isEdit ? editingComponent?.package : preservedPackageData) || {};
    const existingBodyDims = basePkg.bodyDimensions || {};
    const newBodyDims = { ...existingBodyDims };

    if (formValues.bodyLengthMm.trim() !== "") {
      newBodyDims.lengthMm = parseFloat(formValues.bodyLengthMm.trim());
    } else if (isEdit) {
      delete newBodyDims.lengthMm;
    }

    if (formValues.bodyWidthMm.trim() !== "") {
      newBodyDims.widthMm = parseFloat(formValues.bodyWidthMm.trim());
    } else if (isEdit) {
      delete newBodyDims.widthMm;
    }

    const packagePayload = {
      ...basePkg,
      name: formValues.packageName.trim() || basePkg.name || "",
    };

    if (Object.keys(newBodyDims).length > 0) {
      packagePayload.bodyDimensions = newBodyDims;
    } else if (isEdit && basePkg.bodyDimensions) {
      packagePayload.bodyDimensions = {};
    }

    if (packagePayload.name || packagePayload.bodyDimensions || basePkg.pcbLayout) {
      payload.package = packagePayload;
    }

    // Assemble pins
    const validPins = [];
    for (const p of formValues.pins) {
      const numStr = (p.number || "").toString().trim();
      const nameStr = (p.name || "").trim();
      const funcStr = (p.function || "").trim();
      if (!numStr && !nameStr) continue;
      validPins.push({
        number: parseInt(numStr, 10),
        name: nameStr,
        function: funcStr,
      });
    }
    if (isEdit || validPins.length > 0) {
      payload.pins = validPins;
    }

    // Assemble specifications Map/Object
    const specObj = {};
    for (const row of formValues.specifications) {
      const trimmedName = (row.name || "").trim();
      const trimmedVal = (row.value || "").trim();
      const trimmedUnit = (row.unit || "").trim();
      if (!trimmedName && !trimmedVal) continue;
      if (trimmedName) {
        specObj[trimmedName] = trimmedVal;
        if (trimmedUnit) {
          specObj[`${trimmedName}Unit`] = trimmedUnit;
        }
      }
    }
    if (isEdit || Object.keys(specObj).length > 0) {
      payload.specifications = specObj;
    }

    const url = isEdit
      ? `${API_BASE_URL}/components/${editingComponent._id}`
      : `${API_BASE_URL}/components`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(
          responseData.message || `Server error (HTTP ${res.status}): Failed to save component.`
        );
      }
      setIsFormOpen(false);
      setEditingComponent(null);
      setPreservedPackageData(null);
      setFeedbackBanner({
        type: "success",
        message: isEdit
          ? `Component "${payload.partNumber}" updated successfully.`
          : `Component "${payload.partNumber}" created successfully.`,
      });
      refreshList();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
            ? "Unable to connect to backend server to save component. Please verify that the backend is running."
            : err.message
          : "Failed to save component.";
      setServerError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Open delete confirmation modal
  const handleOpenDeleteDialog = (component) => {
    setDeletingComponent(component);
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setDeletingComponent(null);
  };

  // Confirm delete component
  const handleConfirmDelete = async () => {
    if (!deletingComponent) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/components/${deletingComponent._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(
          responseData.message || `Server error (HTTP ${res.status}): Failed to delete component.`
        );
      }
      const deletedPart = deletingComponent.partNumber;
      setDeletingComponent(null);
      setFeedbackBanner({
        type: "success",
        message: `Component "${deletedPart}" deleted successfully.`,
      });
      refreshList();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
            ? "Unable to connect to backend server to delete component. Please verify that the backend is running."
            : err.message
          : "Failed to delete component.";
      setFeedbackBanner({
        type: "error",
        message: msg,
      });
      setDeletingComponent(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="sort-icon-neutral" aria-hidden="true" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp size={12} className="sort-icon-active" aria-hidden="true" />
    ) : (
      <ArrowDown size={12} className="sort-icon-active" aria-hidden="true" />
    );
  };

  const hasActiveFilters = Boolean(adminSearchQuery.trim() || selectedCategory !== "All");

  return (
    <div className="admin-page-container">
      {/* 1. Page Header & Actions Bar */}
      <div className="admin-header-row">
        <div className="admin-header-titles">
          <h1 className="admin-page-title">Manage Components</h1>
          <p className="admin-page-subtitle">
            Create, update, duplicate, and remove electronic components in the Cirqon catalogue.
          </p>
        </div>

        <button
          type="button"
          className="btn-admin-primary"
          onClick={handleOpenAddModal}
          aria-label="Add a new component to catalogue"
        >
          <Plus size={16} aria-hidden="true" />
          <span>Add Component</span>
        </button>
      </div>

      {/* 2. Feedback Banners (Success & Error) */}
      {feedbackBanner && (
        <div className={`admin-banner banner-${feedbackBanner.type}`} role="alert" aria-live="polite">
          <div className="admin-banner-content">
            {feedbackBanner.type === "success" ? (
              <CheckCircle2 size={16} aria-hidden="true" />
            ) : (
              <AlertCircle size={16} aria-hidden="true" />
            )}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            className="admin-banner-close"
            onClick={() => setFeedbackBanner(null)}
            aria-label="Dismiss banner"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 3. Main Components Table Card */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-state-container">
            <Loader2
              size={28}
              className="spin-animation"
              style={{ margin: "0 auto 12px", color: "var(--cq-emerald)" }}
              aria-hidden="true"
            />
            <div className="admin-state-title">Loading components...</div>
            <p style={{ margin: 0, fontSize: "var(--cq-text-sm)" }}>
              Fetching catalogue records from Cirqon database.
            </p>
          </div>
        ) : fetchError ? (
          <div className="admin-state-container">
            <AlertTriangle
              size={28}
              style={{ margin: "0 auto 12px", color: "var(--cq-error)" }}
              aria-hidden="true"
            />
            <div className="admin-state-title">Failed to load components</div>
            <p style={{ margin: "0 0 16px", fontSize: "var(--cq-text-sm)" }}>{fetchError}</p>
            <button type="button" className="btn-admin-primary" onClick={refreshList}>
              Retry
            </button>
          </div>
        ) : components.length === 0 ? (
          <div className="admin-state-container">
            <Package
              size={32}
              style={{ margin: "0 auto 12px", color: "var(--cq-text-muted)" }}
              aria-hidden="true"
            />
            <div className="admin-state-title">No components found</div>
            <p style={{ margin: "0 0 16px", fontSize: "var(--cq-text-sm)" }}>
              The catalogue is currently empty. Click &quot;Add Component&quot; above to create your
              first part.
            </p>
            <button type="button" className="btn-admin-primary" onClick={handleOpenAddModal}>
              <Plus size={16} aria-hidden="true" />
              <span>Add Component</span>
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar: Search input, Category filter, Result count, Clear filters */}
            <div className="admin-table-toolbar">
              <div className="admin-toolbar-left">
                <div className="admin-search-wrapper">
                  <Search size={15} className="admin-search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search part number, name, manufacturer..."
                    value={adminSearchQuery}
                    onChange={(e) => {
                      setAdminSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter components by part number, name, or manufacturer"
                  />
                  {adminSearchQuery && (
                    <button
                      type="button"
                      className="admin-search-clear"
                      onClick={() => {
                        setAdminSearchQuery("");
                        setCurrentPage(1);
                      }}
                      title="Clear search"
                      aria-label="Clear search input"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="admin-filter-category-wrap">
                  <label htmlFor="admin-category-filter" className="sr-only">
                    Filter by Category
                  </label>
                  <select
                    id="admin-category-filter"
                    className="admin-category-select"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter components by category"
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn-clear-filters"
                    onClick={handleClearFilters}
                    aria-label="Clear active filters"
                  >
                    <X size={12} aria-hidden="true" />
                    <span>Clear filters</span>
                  </button>
                )}
              </div>

              <div className="admin-toolbar-right">
                <span className="admin-count-badge">
                  Showing {totalItems} of {components.length} components
                </span>
              </div>
            </div>

            {totalItems === 0 ? (
              <div className="admin-state-container">
                <Package
                  size={28}
                  style={{ margin: "0 auto 12px", color: "var(--cq-text-muted)" }}
                  aria-hidden="true"
                />
                <div className="admin-state-title">No matching components</div>
                <p style={{ margin: "0 0 16px", fontSize: "var(--cq-text-sm)" }}>
                  No catalogue components matched your active filters.
                </p>
                <button type="button" className="btn-admin-primary" onClick={handleClearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="admin-table-scroll">
                  <table
                    className="admin-components-table"
                    aria-label="Electronic components catalogue table"
                  >
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="col-component sortable-th"
                          onClick={() => handleSort("partNumber")}
                        >
                          <div className="th-sort-wrap">
                            <span>Component</span>
                            {renderSortIndicator("partNumber")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="col-maker sortable-th"
                          onClick={() => handleSort("manufacturer")}
                        >
                          <div className="th-sort-wrap">
                            <span>Maker &amp; Category</span>
                            {renderSortIndicator("manufacturer")}
                          </div>
                        </th>
                        <th scope="col" className="col-status">
                          <span>Status</span>
                        </th>
                        <th
                          scope="col"
                          className="col-updated sortable-th"
                          onClick={() => handleSort("updatedAt")}
                        >
                          <div className="th-sort-wrap">
                            <span>Updated</span>
                            {renderSortIndicator("updatedAt")}
                          </div>
                        </th>
                        <th scope="col" className="col-actions">
                          <span>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedComponents.map((comp) => {
                        const isPartActive = comp.isActive !== false;
                        return (
                          <tr
                            key={comp._id}
                            className="admin-table-row"
                            tabIndex={0}
                            role="button"
                            onClick={(e) => handleRowClick(e, comp)}
                            onKeyDown={(e) => handleRowKeyDown(e, comp)}
                            aria-label={`Component ${comp.partNumber}, ${comp.name}. Press Enter or click to edit.`}
                          >
                            <td className="col-component">
                              <div className="admin-cell-component">
                                <div className="admin-thumb-wrapper" aria-hidden="true">
                                  <ComponentThumbnail
                                    component={comp}
                                    size="sm"
                                    showProvenanceBadge={false}
                                  />
                                </div>
                                <div className="admin-component-meta">
                                  <span className="admin-part-number font-mono">
                                    {comp.partNumber}
                                  </span>
                                  <span
                                    className="admin-component-name-truncated"
                                    title={comp.name}
                                  >
                                    {comp.name}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="col-maker">
                              <div className="admin-cell-maker-group">
                                <span className="admin-maker-name">{comp.manufacturer}</span>
                                <span className="admin-category-badge-quiet">{comp.category}</span>
                              </div>
                            </td>
                            <td className="col-status">
                              {!isPartActive ? (
                                <span className="admin-status-badge status-hidden">Hidden</span>
                              ) : null}
                            </td>
                            <td className="col-updated">
                              <span className="admin-updated-date font-mono">
                                {formatDate(comp.updatedAt)}
                              </span>
                            </td>
                            <td className="col-actions">
                              <div className="admin-actions-group">
                                <button
                                  type="button"
                                  className="btn-action-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(comp);
                                  }}
                                  aria-label={`Edit ${comp.partNumber}`}
                                  title={`Edit ${comp.partNumber}`}
                                >
                                  <Pencil size={12} aria-hidden="true" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn-action-more"
                                  onClick={(e) => handleOpenMoreMenu(e, comp)}
                                  aria-haspopup="true"
                                  aria-expanded={activeMenu?.component?._id === comp._id}
                                  aria-label={`More actions for ${comp.partNumber}`}
                                  title="More actions"
                                >
                                  <MoreHorizontal size={15} aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="admin-pagination-bar">
                  <div className="admin-pagination-info">
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                    <span className="admin-pagination-range">
                      ({(currentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems})
                    </span>
                  </div>

                  <div className="admin-pagination-actions">
                    <button
                      type="button"
                      className="btn-pagination"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} aria-hidden="true" />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      className="btn-pagination"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      aria-label="Next page"
                    >
                      <span>Next</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* 4. Shared Create / Edit / Duplicate Form Modal */}
      {isFormOpen && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="form-modal-title"
        >
          <div className="admin-modal-card">
            <header className="admin-modal-header">
              <h2 id="form-modal-title" className="admin-modal-title">
                {editingComponent
                  ? `Edit Component: ${editingComponent.partNumber}`
                  : formValues.name && !editingComponent
                  ? `Duplicate Component: ${formValues.name}`
                  : "Add New Component"}
              </h2>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={handleCloseFormModal}
                disabled={isSaving || isUploadingImage || isUploadingDatasheet}
                aria-label="Close modal"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="admin-modal-body">
              {serverError && (
                <div
                  className="admin-banner banner-error"
                  role="alert"
                  style={{ marginBottom: "var(--cq-space-4)" }}
                >
                  <div className="admin-banner-content">
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>{serverError}</span>
                  </div>
                </div>
              )}

              <form className="admin-form" onSubmit={handleFormSubmit} noValidate>
                {/* Row 1: Part Number & Component Name */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="input-partNumber" className="admin-form-label">
                      Part Number <span className="admin-required-star">*</span>
                    </label>
                    <input
                      id="input-partNumber"
                      type="text"
                      className={`admin-form-input font-mono ${
                        formErrors.partNumber ? "has-error" : ""
                      }`}
                      placeholder="e.g. LM358"
                      value={formValues.partNumber}
                      onChange={(e) => {
                        setFormValues((prev) => ({
                          ...prev,
                          partNumber: e.target.value,
                        }));
                        if (formErrors.partNumber) {
                          setFormErrors((prev) => ({
                            ...prev,
                            partNumber: undefined,
                          }));
                        }
                      }}
                      required
                      aria-invalid={Boolean(formErrors.partNumber)}
                      aria-describedby={formErrors.partNumber ? "err-partNumber" : undefined}
                    />
                    {formErrors.partNumber && (
                      <span id="err-partNumber" className="admin-field-error">
                        {formErrors.partNumber}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="input-name" className="admin-form-label">
                      Component Name <span className="admin-required-star">*</span>
                    </label>
                    <input
                      id="input-name"
                      type="text"
                      className={`admin-form-input ${formErrors.name ? "has-error" : ""}`}
                      placeholder="e.g. Dual Operational Amplifier"
                      value={formValues.name}
                      onChange={(e) => {
                        setFormValues((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }));
                        if (formErrors.name) {
                          setFormErrors((prev) => ({
                            ...prev,
                            name: undefined,
                          }));
                        }
                      }}
                      required
                      aria-invalid={Boolean(formErrors.name)}
                      aria-describedby={formErrors.name ? "err-name" : undefined}
                    />
                    {formErrors.name && (
                      <span id="err-name" className="admin-field-error">
                        {formErrors.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Manufacturer & Category */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="input-manufacturer" className="admin-form-label">
                      Manufacturer <span className="admin-required-star">*</span>
                    </label>
                    <input
                      id="input-manufacturer"
                      type="text"
                      className={`admin-form-input ${formErrors.manufacturer ? "has-error" : ""}`}
                      placeholder="e.g. Texas Instruments"
                      value={formValues.manufacturer}
                      onChange={(e) => {
                        setFormValues((prev) => ({
                          ...prev,
                          manufacturer: e.target.value,
                        }));
                        if (formErrors.manufacturer) {
                          setFormErrors((prev) => ({
                            ...prev,
                            manufacturer: undefined,
                          }));
                        }
                      }}
                      required
                      aria-invalid={Boolean(formErrors.manufacturer)}
                      aria-describedby={
                        formErrors.manufacturer ? "err-manufacturer" : undefined
                      }
                    />
                    {formErrors.manufacturer && (
                      <span id="err-manufacturer" className="admin-field-error">
                        {formErrors.manufacturer}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="select-category" className="admin-form-label">
                      Category <span className="admin-required-star">*</span>
                    </label>
                    <select
                      id="select-category"
                      className={`admin-form-select ${formErrors.category ? "has-error" : ""}`}
                      value={formValues.category}
                      onChange={(e) => {
                        setFormValues((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }));
                        if (formErrors.category) {
                          setFormErrors((prev) => ({
                            ...prev,
                            category: undefined,
                          }));
                        }
                      }}
                      required
                      aria-invalid={Boolean(formErrors.category)}
                      aria-describedby={formErrors.category ? "err-category" : undefined}
                    >
                      <option value="">Select a component category...</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <span id="err-category" className="admin-field-error">
                        {formErrors.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 3: Package Name & Body Dimensions (Length & Width) */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="input-packageName" className="admin-form-label">
                      Package Designation
                    </label>
                    <input
                      id="input-packageName"
                      type="text"
                      className="admin-form-input font-mono"
                      placeholder="e.g. PDIP-8, TO-220, 0805"
                      value={formValues.packageName}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          packageName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="admin-form-group">
                    <span className="admin-form-label">Body Dimensions (Optional, mm)</span>
                    <div className="admin-dimensions-split">
                      <div>
                        <label htmlFor="input-bodyLengthMm" className="admin-sub-label">
                          Length (mm)
                        </label>
                        <input
                          id="input-bodyLengthMm"
                          type="number"
                          step="any"
                          min="0"
                          max="1000"
                          className={`admin-form-input font-mono ${
                            formErrors.bodyLengthMm ? "has-error" : ""
                          }`}
                          placeholder="e.g. 9.81"
                          value={formValues.bodyLengthMm}
                          onChange={(e) => {
                            setFormValues((prev) => ({
                              ...prev,
                              bodyLengthMm: e.target.value,
                            }));
                            if (formErrors.bodyLengthMm) {
                              setFormErrors((prev) => ({
                                ...prev,
                                bodyLengthMm: undefined,
                              }));
                            }
                          }}
                        />
                        {formErrors.bodyLengthMm && (
                          <span className="admin-field-error">{formErrors.bodyLengthMm}</span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="input-bodyWidthMm" className="admin-sub-label">
                          Width (mm)
                        </label>
                        <input
                          id="input-bodyWidthMm"
                          type="number"
                          step="any"
                          min="0"
                          max="1000"
                          className={`admin-form-input font-mono ${
                            formErrors.bodyWidthMm ? "has-error" : ""
                          }`}
                          placeholder="e.g. 6.35"
                          value={formValues.bodyWidthMm}
                          onChange={(e) => {
                            setFormValues((prev) => ({
                              ...prev,
                              bodyWidthMm: e.target.value,
                            }));
                            if (formErrors.bodyWidthMm) {
                              setFormErrors((prev) => ({
                                ...prev,
                                bodyWidthMm: undefined,
                              }));
                            }
                          }}
                        />
                        {formErrors.bodyWidthMm && (
                          <span className="admin-field-error">{formErrors.bodyWidthMm}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 4: Component Image (Upload + URL) */}
                <div className="admin-form-group">
                  <label htmlFor="input-image-file" className="admin-form-label">
                    Component Image (Upload or URL)
                  </label>

                  {/* File Picker */}
                  <div className="admin-file-picker-row">
                    <input
                      id="input-image-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={handleImageFileChange}
                      disabled={isUploadingImage || isSaving}
                      className="admin-file-input"
                      aria-label="Upload component product image (JPG, PNG, or WebP up to 2 MB)"
                    />
                    {isUploadingImage && (
                      <span className="upload-status-indicator">
                        <Loader2 size={14} className="spin-animation" aria-hidden="true" />
                        <span>Uploading...</span>
                      </span>
                    )}
                  </div>

                  {imageUploadError && (
                    <span className="admin-field-error">{imageUploadError}</span>
                  )}

                  {/* Image Preview & Remove button */}
                  {formValues.imageUrl && (
                    <div className="admin-asset-preview image-preview-row">
                      <img
                        src={resolveAssetUrl(formValues.imageUrl)}
                        alt="Component Preview"
                        className="admin-preview-thumbnail"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <span className="admin-preview-url font-mono" title={formValues.imageUrl}>
                        {imageFileChosenName || formValues.imageUrl}
                      </span>
                      <button
                        type="button"
                        className="btn-asset-remove"
                        onClick={() => {
                          setFormValues((prev) => ({ ...prev, imageUrl: "" }));
                          setImageFileChosenName(null);
                          setImageUploadError(null);
                        }}
                        title="Remove image"
                        aria-label="Remove image"
                      >
                        <X size={13} aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}

                  {/* Fallback URL Text Input */}
                  <input
                    id="input-imageUrl"
                    type="text"
                    className={`admin-form-input ${formErrors.imageUrl ? "has-error" : ""}`}
                    placeholder="Or paste image URL (https://... or /uploads/...)"
                    value={formValues.imageUrl}
                    onChange={(e) => {
                      setFormValues((prev) => ({
                        ...prev,
                        imageUrl: e.target.value,
                      }));
                      if (formErrors.imageUrl) {
                        setFormErrors((prev) => ({
                          ...prev,
                          imageUrl: undefined,
                        }));
                      }
                    }}
                    aria-invalid={Boolean(formErrors.imageUrl)}
                    aria-describedby={formErrors.imageUrl ? "err-imageUrl" : undefined}
                  />
                  {formErrors.imageUrl && (
                    <span id="err-imageUrl" className="admin-field-error">
                      {formErrors.imageUrl}
                    </span>
                  )}
                </div>

                {/* Row 5: Datasheet (Upload + URL) & Manufacturer URL */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="input-datasheet-file" className="admin-form-label">
                      Datasheet PDF (Upload or URL)
                    </label>

                    <div className="admin-file-picker-row">
                      <input
                        id="input-datasheet-file"
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleDatasheetFileChange}
                        disabled={isUploadingDatasheet || isSaving}
                        className="admin-file-input"
                        aria-label="Upload official datasheet PDF (up to 10 MB)"
                      />
                      {isUploadingDatasheet && (
                        <span className="upload-status-indicator">
                          <Loader2 size={14} className="spin-animation" aria-hidden="true" />
                          <span>Uploading PDF...</span>
                        </span>
                      )}
                    </div>

                    {datasheetUploadError && (
                      <span className="admin-field-error">{datasheetUploadError}</span>
                    )}

                    {formValues.datasheetUrl && (
                      <div className="admin-asset-preview datasheet-preview-row">
                        <FileText size={16} className="datasheet-preview-icon" aria-hidden="true" />
                        <a
                          href={resolveAssetUrl(formValues.datasheetUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-preview-url font-mono"
                          title="Open datasheet in new tab"
                        >
                          {datasheetFileChosenName || formValues.datasheetUrl} ↗
                        </a>
                        <button
                          type="button"
                          className="btn-asset-remove"
                          onClick={() => {
                            setFormValues((prev) => ({
                              ...prev,
                              datasheetUrl: "",
                            }));
                            setDatasheetFileChosenName(null);
                            setDatasheetUploadError(null);
                          }}
                          title="Remove datasheet"
                          aria-label="Remove datasheet"
                        >
                          <X size={13} aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}

                    <input
                      id="input-datasheetUrl"
                      type="text"
                      className={`admin-form-input ${formErrors.datasheetUrl ? "has-error" : ""}`}
                      placeholder="Or paste datasheet URL (https://... or /uploads/...)"
                      value={formValues.datasheetUrl}
                      onChange={(e) => {
                        setFormValues((prev) => ({
                          ...prev,
                          datasheetUrl: e.target.value,
                        }));
                        if (formErrors.datasheetUrl) {
                          setFormErrors((prev) => ({
                            ...prev,
                            datasheetUrl: undefined,
                          }));
                        }
                      }}
                      aria-invalid={Boolean(formErrors.datasheetUrl)}
                      aria-describedby={formErrors.datasheetUrl ? "err-datasheetUrl" : undefined}
                    />
                    {formErrors.datasheetUrl && (
                      <span id="err-datasheetUrl" className="admin-field-error">
                        {formErrors.datasheetUrl}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="input-manufacturerUrl" className="admin-form-label">
                      Manufacturer Product URL
                    </label>
                    <input
                      id="input-manufacturerUrl"
                      type="url"
                      className={`admin-form-input ${
                        formErrors.manufacturerUrl ? "has-error" : ""
                      }`}
                      placeholder="https://example.com/product"
                      value={formValues.manufacturerUrl}
                      onChange={(e) => {
                        setFormValues((prev) => ({
                          ...prev,
                          manufacturerUrl: e.target.value,
                        }));
                        if (formErrors.manufacturerUrl) {
                          setFormErrors((prev) => ({
                            ...prev,
                            manufacturerUrl: undefined,
                          }));
                        }
                      }}
                      aria-invalid={Boolean(formErrors.manufacturerUrl)}
                      aria-describedby={
                        formErrors.manufacturerUrl ? "err-manufacturerUrl" : undefined
                      }
                    />
                    {formErrors.manufacturerUrl && (
                      <span id="err-manufacturerUrl" className="admin-field-error">
                        {formErrors.manufacturerUrl}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 6: Dynamic Pins Editor */}
                <div className="admin-form-section">
                  <div className="admin-section-header">
                    <div>
                      <h3 className="admin-section-title">Component Pins (Optional)</h3>
                      <p className="admin-section-subtitle">
                        Define pin numbers and names for pinout reference.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-add-dynamic-row"
                      onClick={handleAddPin}
                      aria-label="Add a pin definition row"
                    >
                      <Plus size={13} aria-hidden="true" />
                      <span>Add Pin</span>
                    </button>
                  </div>

                  {formErrors.pins && (
                    <div className="admin-field-error" style={{ marginBottom: "8px" }}>
                      {formErrors.pins}
                    </div>
                  )}

                  {formValues.pins.length === 0 ? (
                    <div className="dynamic-empty-placeholder">
                      No pins configured. Click &quot;Add Pin&quot; to define pin mappings.
                    </div>
                  ) : (
                    <div className="dynamic-rows-list">
                      {formValues.pins.map((pin, idx) => (
                        <div key={idx} className="dynamic-pin-row">
                          <div className="pin-col-num">
                            <label htmlFor={`pin-num-${idx}`} className="sr-only">
                              Pin #{idx + 1} Number
                            </label>
                            <input
                              id={`pin-num-${idx}`}
                              type="number"
                              min="1"
                              className="admin-form-input font-mono"
                              placeholder="Pin #"
                              value={pin.number}
                              onChange={(e) => handlePinChange(idx, "number", e.target.value)}
                            />
                          </div>
                          <div className="pin-col-name">
                            <label htmlFor={`pin-name-${idx}`} className="sr-only">
                              Pin #{idx + 1} Name
                            </label>
                            <input
                              id={`pin-name-${idx}`}
                              type="text"
                              maxLength={50}
                              className="admin-form-input"
                              placeholder="Pin Name (e.g. VCC, GND, OUT)"
                              value={pin.name}
                              onChange={(e) => handlePinChange(idx, "name", e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-remove-dynamic-row"
                            onClick={() => handleRemovePin(idx)}
                            aria-label={`Remove pin row ${idx + 1}`}
                            title="Remove pin"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 7: Dynamic Specifications Editor */}
                <div className="admin-form-section">
                  <div className="admin-section-header">
                    <div>
                      <h3 className="admin-section-title">Technical Specifications (Optional)</h3>
                      <p className="admin-section-subtitle">
                        Add key-value engineering parameters (e.g. supplyVoltageMax, bandwidth).
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-add-dynamic-row"
                      onClick={handleAddSpec}
                      aria-label="Add a specification row"
                    >
                      <Plus size={13} aria-hidden="true" />
                      <span>Add Spec</span>
                    </button>
                  </div>

                  {formErrors.specifications && (
                    <div className="admin-field-error" style={{ marginBottom: "8px" }}>
                      {formErrors.specifications}
                    </div>
                  )}

                  {formValues.specifications.length === 0 ? (
                    <div className="dynamic-empty-placeholder">
                      No technical specifications configured. Click &quot;Add Spec&quot; to add one.
                    </div>
                  ) : (
                    <div className="dynamic-rows-list">
                      {formValues.specifications.map((spec, idx) => (
                        <div key={idx} className="dynamic-spec-row">
                          <div className="spec-col-name">
                            <label htmlFor={`spec-name-${idx}`} className="sr-only">
                              Spec #{idx + 1} Name
                            </label>
                            <input
                              id={`spec-name-${idx}`}
                              type="text"
                              maxLength={60}
                              className="admin-form-input font-mono"
                              placeholder="Parameter name"
                              value={spec.name}
                              onChange={(e) => handleSpecChange(idx, "name", e.target.value)}
                            />
                          </div>
                          <div className="spec-col-val">
                            <label htmlFor={`spec-val-${idx}`} className="sr-only">
                              Spec #{idx + 1} Value
                            </label>
                            <input
                              id={`spec-val-${idx}`}
                              type="text"
                              maxLength={200}
                              className="admin-form-input"
                              placeholder="Value"
                              value={spec.value}
                              onChange={(e) => handleSpecChange(idx, "value", e.target.value)}
                            />
                          </div>
                          <div className="spec-col-unit">
                            <label htmlFor={`spec-unit-${idx}`} className="sr-only">
                              Spec #{idx + 1} Unit
                            </label>
                            <input
                              id={`spec-unit-${idx}`}
                              type="text"
                              maxLength={20}
                              className="admin-form-input font-mono"
                              placeholder="Unit"
                              value={spec.unit}
                              onChange={(e) => handleSpecChange(idx, "unit", e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-remove-dynamic-row"
                            onClick={() => handleRemoveSpec(idx)}
                            aria-label={`Remove specification row ${idx + 1}`}
                            title="Remove specification"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="admin-form-group">
                  <label htmlFor="input-description" className="admin-form-label">
                    Functional Description
                  </label>
                  <textarea
                    id="input-description"
                    className="admin-form-textarea"
                    placeholder="Brief overview of component function and typical engineering applications..."
                    value={formValues.description}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Form Buttons */}
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="btn-admin-cancel"
                    onClick={handleCloseFormModal}
                    disabled={isSaving || isUploadingImage || isUploadingDatasheet}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-admin-primary"
                    disabled={
                      !isDirty || isSaving || isUploadingImage || isUploadingDatasheet
                    }
                    title={
                      !isDirty
                        ? "Make changes to the form to enable saving"
                        : "Save changes to catalogue"
                    }
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={14} className="spin-animation" aria-hidden="true" />
                        <span>Saving...</span>
                      </>
                    ) : isUploadingImage || isUploadingDatasheet ? (
                      <>
                        <Loader2 size={14} className="spin-animation" aria-hidden="true" />
                        <span>Uploading file...</span>
                      </>
                    ) : (
                      <span>
                        {editingComponent
                          ? "Update Component"
                          : formValues.name && !editingComponent
                          ? "Save Duplicate"
                          : "Create Component"}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {deletingComponent && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="admin-modal-card delete-dialog-card">
            <header className="admin-modal-header">
              <h2 id="delete-dialog-title" className="admin-modal-title">
                Confirm Component Deletion
              </h2>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={handleCloseDeleteDialog}
                disabled={isDeleting}
                aria-label="Close dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="admin-modal-body">
              <div className="delete-dialog-content">
                <div className="delete-dialog-icon-row">
                  <AlertTriangle size={24} aria-hidden="true" />
                </div>
                <p className="delete-dialog-text">
                  Delete <strong>{deletingComponent.partNumber}</strong> ({deletingComponent.name})?
                  This also removes it from users&apos; saved lists.
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--cq-text-xs)",
                    color: "var(--cq-text-muted)",
                  }}
                >
                  This action is permanent and cannot be undone.
                </p>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="btn-admin-cancel"
                  onClick={handleCloseDeleteDialog}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-admin-danger"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="spin-animation" aria-hidden="true" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} aria-hidden="true" />
                      <span>Delete Component</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Accessible Portal-Mounted More Actions Dropdown Menu */}
      {activeMenu &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Component actions menu"
            className="admin-actions-dropdown"
            style={{
              position: "fixed",
              top: `${Math.min(activeMenu.anchorRect.bottom + 4, window.innerHeight - 150)}px`,
              right: `${Math.max(8, window.innerWidth - activeMenu.anchorRect.right)}px`,
              zIndex: 1100,
            }}
            onKeyDown={handleMenuKeyDown}
          >
            <button
              type="button"
              role="menuitem"
              className="admin-dropdown-item"
              onClick={() => {
                const comp = activeMenu.component;
                setActiveMenu(null);
                handleOpenDuplicateModal(comp);
              }}
            >
              <Copy size={13} aria-hidden="true" />
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="admin-dropdown-item"
              onClick={() => {
                const comp = activeMenu.component;
                setActiveMenu(null);
                handleToggleActive(comp);
              }}
            >
              {activeMenu.component.isActive === false ? (
                <>
                  <Eye size={13} aria-hidden="true" />
                  <span>Show in catalogue</span>
                </>
              ) : (
                <>
                  <EyeOff size={13} aria-hidden="true" />
                  <span>Hide from catalogue</span>
                </>
              )}
            </button>

            <div className="admin-dropdown-divider" role="separator" />

            <button
              type="button"
              role="menuitem"
              className="admin-dropdown-item item-delete"
              onClick={() => {
                const comp = activeMenu.component;
                setActiveMenu(null);
                handleOpenDeleteDialog(comp);
              }}
            >
              <Trash2 size={13} aria-hidden="true" />
              <span>Delete</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

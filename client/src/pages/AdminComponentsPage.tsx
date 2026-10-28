// Administrative CRUD management view for electronic components.

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import type { ComponentData } from "../types";
import { resolveAssetUrl } from "../utils/formatters";
import "./AdminComponentsPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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
] as const;

interface FormValues {
  partNumber: string;
  name: string;
  manufacturer: string;
  category: string;
  packageName: string;
  description: string;
  imageUrl: string;
  datasheetUrl: string;
  manufacturerUrl: string;
}

interface FormErrors {
  partNumber?: string;
  name?: string;
  manufacturer?: string;
  category?: string;
  imageUrl?: string;
  datasheetUrl?: string;
  manufacturerUrl?: string;
}

/**
 * Validates external HTTP/HTTPS URLs or uploaded asset paths starting with /uploads/.
 */
function isValidHttpUrl(urlString: string): boolean {
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
function isValidImageUrl(urlString: string): boolean {
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
 * VIVA EXPLANATION:
 * 1. Client-Side and Server-Side Validation Duality (Defense-in-Depth):
 *    - Client-side validation runs immediately in the browser on user input, providing
 *      instant feedback (e.g. required field missing, malformed URL, oversized file) without
 *      incurring network latency or server load.
 *    - However, client validation alone can be easily bypassed (e.g. using curl or Postman).
 *      Therefore, the server replicates identical validation rules in `componentRoutes.js` and
 *      `uploadRoutes.js` as the authoritative security boundary.
 * 2. Referential Integrity & Cascade Deletion UX:
 *    - Deleting a component removes it permanently and purges referencing bookmarks in
 *      `SavedPart`. The UI explicitly warns the administrator of this cascading side effect
 *      before dispatching the DELETE request.
 * 3. File Upload Architecture:
 *    - Uploading a file streams the binary directly to `/api/uploads/image` or `/api/uploads/datasheet`,
 *      which validates file headers/magic bytes, generates a randomized filename, writes to disk,
 *      and returns a clean URL path (e.g. `/uploads/images/<uuid>.webp`).
 *    - The returned URL automatically fills the form field, keeping database storage lean and
 *      avoiding storing heavy binary Blobs inside MongoDB documents.
 */
export const AdminComponentsPage: React.FC = () => {
  const { token } = useAuth();

  const [components, setComponents] = useState<ComponentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Operational feedback banner state
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form modal state (used for both Add and Edit)
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingComponent, setEditingComponent] =
    useState<ComponentData | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({
    partNumber: "",
    name: "",
    manufacturer: "",
    category: "",
    packageName: "",
    description: "",
    imageUrl: "",
    datasheetUrl: "",
    manufacturerUrl: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // File upload state for image
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageFileChosenName, setImageFileChosenName] = useState<string | null>(null);

  // File upload state for datasheet
  const [isUploadingDatasheet, setIsUploadingDatasheet] = useState<boolean>(false);
  const [datasheetUploadError, setDatasheetUploadError] = useState<string | null>(null);
  const [datasheetFileChosenName, setDatasheetFileChosenName] = useState<string | null>(null);

  // Delete confirmation dialog state
  const [deletingComponent, setDeletingComponent] =
    useState<ComponentData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Trigger state to refresh the component list without full page reload
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch all components from catalogue
  useEffect(() => {
    let cancelled = false;

    async function loadComponents() {
      try {
        const res = await fetch(`${API_BASE_URL}/components`);
        if (!res.ok) {
          throw new Error(`Failed to load components: HTTP ${res.status}`);
        }
        const data: ComponentData[] = await res.json();
        if (!cancelled) {
          setComponents(data);
          setFetchError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
                  ? "Unable to connect to the backend server. Please verify that the backend is running on port 5000."
                  : err.message)
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

  // Open modal in "Create" mode
  const handleOpenAddModal = () => {
    setEditingComponent(null);
    setFormValues({
      partNumber: "",
      name: "",
      manufacturer: "",
      category: "",
      packageName: "",
      description: "",
      imageUrl: "",
      datasheetUrl: "",
      manufacturerUrl: "",
    });
    setFormErrors({});
    setServerError(null);
    setImageUploadError(null);
    setImageFileChosenName(null);
    setDatasheetUploadError(null);
    setDatasheetFileChosenName(null);
    setIsFormOpen(true);
  };

  // Open modal in "Edit" mode with pre-filled values
  const handleOpenEditModal = (component: ComponentData) => {
    setEditingComponent(component);
    setFormValues({
      partNumber: component.partNumber || "",
      name: component.name || "",
      manufacturer: component.manufacturer || "",
      category: component.category || "",
      packageName: component.package?.name || "",
      description: component.description || "",
      imageUrl: component.imageUrl || "",
      datasheetUrl: component.datasheetUrl || "",
      manufacturerUrl: component.manufacturerUrl || "",
    });
    setFormErrors({});
    setServerError(null);
    setImageUploadError(null);
    setImageFileChosenName(null);
    setDatasheetUploadError(null);
    setDatasheetFileChosenName(null);
    setIsFormOpen(true);
  };

  const handleCloseFormModal = () => {
    if (isSaving || isUploadingImage || isUploadingDatasheet) return;
    setIsFormOpen(false);
    setEditingComponent(null);
    setFormErrors({});
    setServerError(null);
    setImageUploadError(null);
    setImageFileChosenName(null);
    setDatasheetUploadError(null);
    setDatasheetFileChosenName(null);
  };

  // Client-side image file upload handler
  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError(null);

    // Validate size (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      setImageUploadError("Image file too large. Maximum size is 2 MB.");
      e.target.value = "";
      return;
    }

    // Validate extension / MIME
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedExts.includes(ext) && !allowedTypes.includes(file.type)) {
      setImageUploadError(
        "Invalid image type. Only JPG, PNG, and WebP files are allowed."
      );
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
              ? "Unable to connect to upload server. Please verify that the backend is running."
              : err.message)
          : "Failed to upload image.";
      setImageUploadError(msg);
      setImageFileChosenName(null);
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  // Client-side datasheet file upload handler
  const handleDatasheetFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDatasheetUploadError(null);

    // Validate size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setDatasheetUploadError(
        "Datasheet file too large. Maximum size is 10 MB."
      );
      e.target.value = "";
      return;
    }

    // Validate extension / MIME (PDF only)
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".pdf" && file.type !== "application/pdf") {
      setDatasheetUploadError(
        "Invalid document type. Only PDF files are allowed for datasheets."
      );
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
              ? "Unable to connect to upload server. Please verify that the backend is running."
              : err.message)
          : "Failed to upload datasheet.";
      setDatasheetUploadError(msg);
      setDatasheetFileChosenName(null);
    } finally {
      setIsUploadingDatasheet(false);
      e.target.value = "";
    }
  };

  // Client-side form validation mirroring server rules
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

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
    } else if (
      !CATEGORIES.includes(formValues.category as (typeof CATEGORIES)[number])
    ) {
      errors.category = "Please select a valid category from the list.";
    }

    if (formValues.datasheetUrl && !isValidHttpUrl(formValues.datasheetUrl)) {
      errors.datasheetUrl =
        "Datasheet URL must be a valid HTTP or HTTPS address, or an uploaded /uploads/ path.";
    }

    if (
      formValues.manufacturerUrl &&
      !isValidHttpUrl(formValues.manufacturerUrl)
    ) {
      errors.manufacturerUrl =
        "Manufacturer URL must be a valid HTTP or HTTPS address.";
    }

    if (formValues.imageUrl && !isValidImageUrl(formValues.imageUrl)) {
      errors.imageUrl =
        "Image URL must be a valid HTTP, HTTPS, or relative image path (e.g. /images/... or /uploads/...).";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submit handler for Create / Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setServerError(null);

    // Build payload: omit empty optional fields so technical specs are not invented
    const payload: Record<string, unknown> = {
      partNumber: formValues.partNumber.trim(),
      name: formValues.name.trim(),
      manufacturer: formValues.manufacturer.trim(),
      category: formValues.category.trim(),
    };

    if (formValues.description.trim()) {
      payload.description = formValues.description.trim();
    }
    if (formValues.imageUrl.trim()) {
      payload.imageUrl = formValues.imageUrl.trim();
    }
    if (formValues.datasheetUrl.trim()) {
      payload.datasheetUrl = formValues.datasheetUrl.trim();
    }
    if (formValues.manufacturerUrl.trim()) {
      payload.manufacturerUrl = formValues.manufacturerUrl.trim();
    }

    // Preserve existing package geometry on edit, or update package name if provided
    if (editingComponent?.package || formValues.packageName.trim()) {
      payload.package = {
        ...(editingComponent?.package || {}),
        name: formValues.packageName.trim() || editingComponent?.package?.name || "",
      };
    }

    const isEdit = Boolean(editingComponent);
    const url = isEdit
      ? `${API_BASE_URL}/components/${editingComponent!._id}`
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
          responseData.message ||
            `Server error (HTTP ${res.status}): Failed to save component.`
        );
      }

      // Success: close modal, refresh list in-place, show banner
      setIsFormOpen(false);
      setEditingComponent(null);
      setFeedbackBanner({
        type: "success",
        message: isEdit
          ? `Component "${payload.partNumber}" updated successfully.`
          : `Component "${payload.partNumber}" created successfully.`,
      });

      refreshList();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
              ? "Unable to connect to backend server to save component. Please verify that the backend is running."
              : err.message)
          : "Failed to save component.";
      setServerError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Open delete confirmation modal
  const handleOpenDeleteDialog = (component: ComponentData) => {
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
      const res = await fetch(
        `${API_BASE_URL}/components/${deletingComponent._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(
          responseData.message ||
            `Server error (HTTP ${res.status}): Failed to delete component.`
        );
      }

      const deletedPart = deletingComponent.partNumber;
      setDeletingComponent(null);
      setFeedbackBanner({
        type: "success",
        message: `Component "${deletedPart}" deleted successfully.`,
      });

      refreshList();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
              ? "Unable to connect to backend server to delete component. Please verify that the backend is running."
              : err.message)
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

  return (
    <div className="admin-page-container">
      {/* 1. Page Header & Actions Bar */}
      <div className="admin-header-row">
        <div className="admin-header-titles">
          <h1 className="admin-page-title">Manage Components</h1>
          <p className="admin-page-subtitle">
            Create, update, and remove electronic components in the Cirqon
            catalogue.
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
        <div
          className={`admin-banner banner-${feedbackBanner.type}`}
          role="alert"
          aria-live="polite"
        >
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
              Fetching latest catalogue records from Cirqon database.
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
            <p style={{ margin: "0 0 16px", fontSize: "var(--cq-text-sm)" }}>
              {fetchError}
            </p>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={refreshList}
            >
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
              The catalogue is currently empty. Click &quot;Add Component&quot;
              above to create your first part.
            </p>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={handleOpenAddModal}
            >
              <Plus size={16} aria-hidden="true" />
              <span>Add Component</span>
            </button>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table
              className="admin-components-table"
              aria-label="Electronic components catalogue table"
            >
              <thead>
                <tr>
                  <th scope="col">Part Number</th>
                  <th scope="col">Component Name</th>
                  <th scope="col">Manufacturer</th>
                  <th scope="col">Category</th>
                  <th scope="col">Package</th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp) => (
                  <tr key={comp._id}>
                    <td>
                      <span className="admin-part-number">
                        {comp.partNumber}
                      </span>
                    </td>
                    <td>
                      <span className="admin-component-name">{comp.name}</span>
                    </td>
                    <td>{comp.manufacturer}</td>
                    <td>
                      <span className="admin-category-badge">
                        {comp.category}
                      </span>
                    </td>
                    <td>{comp.package?.name || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        className="admin-table-actions"
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          type="button"
                          className="btn-row-action"
                          onClick={() => handleOpenEditModal(comp)}
                          aria-label={`Edit ${comp.partNumber}`}
                          title={`Edit ${comp.partNumber}`}
                        >
                          <Pencil size={13} aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="btn-row-action action-delete"
                          onClick={() => handleOpenDeleteDialog(comp)}
                          aria-label={`Delete ${comp.partNumber}`}
                          title={`Delete ${comp.partNumber}`}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Shared Create / Edit Form Modal */}
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
                    <label
                      htmlFor="input-partNumber"
                      className="admin-form-label"
                    >
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
                      aria-describedby={
                        formErrors.partNumber ? "err-partNumber" : undefined
                      }
                    />
                    {formErrors.partNumber && (
                      <span id="err-partNumber" className="admin-field-error">
                        {formErrors.partNumber}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="input-name" className="admin-form-label">
                      Component Name{" "}
                      <span className="admin-required-star">*</span>
                    </label>
                    <input
                      id="input-name"
                      type="text"
                      className={`admin-form-input ${
                        formErrors.name ? "has-error" : ""
                      }`}
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
                      aria-describedby={
                        formErrors.name ? "err-name" : undefined
                      }
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
                    <label
                      htmlFor="input-manufacturer"
                      className="admin-form-label"
                    >
                      Manufacturer{" "}
                      <span className="admin-required-star">*</span>
                    </label>
                    <input
                      id="input-manufacturer"
                      type="text"
                      className={`admin-form-input ${
                        formErrors.manufacturer ? "has-error" : ""
                      }`}
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
                      <span
                        id="err-manufacturer"
                        className="admin-field-error"
                      >
                        {formErrors.manufacturer}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label
                      htmlFor="select-category"
                      className="admin-form-label"
                    >
                      Category <span className="admin-required-star">*</span>
                    </label>
                    <select
                      id="select-category"
                      className={`admin-form-select ${
                        formErrors.category ? "has-error" : ""
                      }`}
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
                      aria-describedby={
                        formErrors.category ? "err-category" : undefined
                      }
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

                {/* Row 3: Package Name & Component Image (Upload + URL) */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label
                      htmlFor="input-packageName"
                      className="admin-form-label"
                    >
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
                    <label
                      htmlFor="input-image-file"
                      className="admin-form-label"
                    >
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
                          <Loader2
                            size={14}
                            className="spin-animation"
                            aria-hidden="true"
                          />
                          <span>Uploading...</span>
                        </span>
                      )}
                    </div>

                    {imageUploadError && (
                      <span className="admin-field-error">
                        {imageUploadError}
                      </span>
                    )}

                    {/* Image Preview & Remove button */}
                    {formValues.imageUrl && (
                      <div className="admin-asset-preview image-preview-row">
                        <img
                          src={resolveAssetUrl(formValues.imageUrl)}
                          alt="Component Preview"
                          className="admin-preview-thumbnail"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <span
                          className="admin-preview-url font-mono"
                          title={formValues.imageUrl}
                        >
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
                      className={`admin-form-input ${
                        formErrors.imageUrl ? "has-error" : ""
                      }`}
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
                      aria-describedby={
                        formErrors.imageUrl ? "err-imageUrl" : undefined
                      }
                    />
                    {formErrors.imageUrl && (
                      <span id="err-imageUrl" className="admin-field-error">
                        {formErrors.imageUrl}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 4: Datasheet (Upload + URL) & Manufacturer URL */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label
                      htmlFor="input-datasheet-file"
                      className="admin-form-label"
                    >
                      Datasheet PDF (Upload or URL)
                    </label>

                    {/* PDF File Picker */}
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
                          <Loader2
                            size={14}
                            className="spin-animation"
                            aria-hidden="true"
                          />
                          <span>Uploading PDF...</span>
                        </span>
                      )}
                    </div>

                    {datasheetUploadError && (
                      <span className="admin-field-error">
                        {datasheetUploadError}
                      </span>
                    )}

                    {/* Datasheet Preview & Remove button */}
                    {formValues.datasheetUrl && (
                      <div className="admin-asset-preview datasheet-preview-row">
                        <FileText
                          size={16}
                          className="datasheet-preview-icon"
                          aria-hidden="true"
                        />
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

                    {/* Fallback Datasheet URL Text Input */}
                    <input
                      id="input-datasheetUrl"
                      type="text"
                      className={`admin-form-input ${
                        formErrors.datasheetUrl ? "has-error" : ""
                      }`}
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
                      aria-describedby={
                        formErrors.datasheetUrl ? "err-datasheetUrl" : undefined
                      }
                    />
                    {formErrors.datasheetUrl && (
                      <span
                        id="err-datasheetUrl"
                        className="admin-field-error"
                      >
                        {formErrors.datasheetUrl}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label
                      htmlFor="input-manufacturerUrl"
                      className="admin-form-label"
                    >
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
                        formErrors.manufacturerUrl
                          ? "err-manufacturerUrl"
                          : undefined
                      }
                    />
                    {formErrors.manufacturerUrl && (
                      <span
                        id="err-manufacturerUrl"
                        className="admin-field-error"
                      >
                        {formErrors.manufacturerUrl}
                      </span>
                    )}
                  </div>
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
                    disabled={isSaving || isUploadingImage || isUploadingDatasheet}
                  >
                    {isSaving ? (
                      <>
                        <Loader2
                          size={14}
                          className="spin-animation"
                          aria-hidden="true"
                        />
                        <span>Saving...</span>
                      </>
                    ) : isUploadingImage || isUploadingDatasheet ? (
                      <>
                        <Loader2
                          size={14}
                          className="spin-animation"
                          aria-hidden="true"
                        />
                        <span>Uploading file...</span>
                      </>
                    ) : (
                      <span>
                        {editingComponent
                          ? "Update Component"
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
                  Delete <strong>{deletingComponent.partNumber}</strong> (
                  {deletingComponent.name})? This also removes it from users&apos;
                  saved lists.
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
                      <Loader2
                        size={14}
                        className="spin-animation"
                        aria-hidden="true"
                      />
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
    </div>
  );
};

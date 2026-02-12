import { invoke } from "@tauri-apps/api/core";
import type {
  Template,
  CreateTemplateArgs,
  UpdateTemplateArgs,
  TemplateCategory,
  AddTemplateCategoryArgs,
} from "../types/template.types";

// ============================================================================
// Template CRUD Operations
// ============================================================================

/**
 * Creates a new budget template.
 *
 * @param args - Template creation arguments
 * @returns The created template
 * @throws Error if no database is open or validation fails
 */
export const createTemplate = async (
  args: CreateTemplateArgs
): Promise<Template> => {
  return await invoke<Template>("create_template", { args });
};

/**
 * Lists all budget templates.
 *
 * @returns Array of all templates, sorted by name
 * @throws Error if no database is open
 */
export const listTemplates = async (): Promise<Template[]> => {
  return await invoke<Template[]>("list_templates");
};

/**
 * Gets a single template by ID.
 *
 * @param templateId - The ID of the template to get
 * @returns The template
 * @throws Error if not found or no database is open
 */
export const getTemplate = async (templateId: number): Promise<Template> => {
  return await invoke<Template>("get_template", { templateId });
};

/**
 * Updates an existing template.
 *
 * @param templateId - The ID of the template to update
 * @param args - Updated template data
 * @returns The updated template
 * @throws Error if not found or validation fails
 */
export const updateTemplate = async (
  templateId: number,
  args: UpdateTemplateArgs
): Promise<Template> => {
  return await invoke<Template>("update_template", {
    templateId,
    args,
  });
};

/**
 * Deletes a template by ID.
 * Also deletes all associated template categories (CASCADE).
 *
 * @param templateId - The ID of the template to delete
 * @throws Error if not found or no database is open
 */
export const deleteTemplate = async (templateId: number): Promise<void> => {
  await invoke("delete_template", { templateId });
};

// ============================================================================
// Template Category Operations
// ============================================================================

/**
 * Gets all categories for a template.
 *
 * @param templateId - The ID of the template
 * @returns Array of template categories with their allocated amounts
 * @throws Error if no database is open
 */
export const getTemplateCategories = async (
  templateId: number
): Promise<TemplateCategory[]> => {
  return await invoke<TemplateCategory[]>("get_template_categories", {
    templateId,
  });
};

/**
 * Adds a category to a template with a default amount.
 *
 * @param args - Arguments including template_id, global_category_id, and allocated_amount
 * @returns The created template category
 * @throws Error if category already exists in template
 */
export const addCategoryToTemplate = async (
  args: AddTemplateCategoryArgs
): Promise<TemplateCategory> => {
  return await invoke<TemplateCategory>("add_category_to_template", { args });
};

/**
 * Removes a category from a template.
 *
 * @param templateCategoryId - The ID of the template category to remove
 * @throws Error if not found
 */
export const removeCategoryFromTemplate = async (
  templateCategoryId: number
): Promise<void> => {
  await invoke("remove_category_from_template", {
    templateCategoryId,
  });
};

/**
 * Updates the allocated amount for a template category.
 *
 * @param templateCategoryId - The ID of the template category
 * @param allocatedAmount - The new allocated amount
 * @throws Error if not found
 */
export const updateTemplateCategoryAmount = async (
  templateCategoryId: number,
  allocatedAmount: number
): Promise<void> => {
  await invoke("update_template_category_amount", {
    templateCategoryId,
    allocatedAmount,
  });
};

/**
 * Reorders the categories of a template by updating their sort_order.
 *
 * @param templateId - The ID of the template
 * @param orderedIds - Array of template_category_ids in the desired display order
 * @throws Error if any category is not found or no database is open
 */
export const reorderTemplateCategories = async (
  templateId: number,
  orderedIds: number[]
): Promise<void> => {
  await invoke("reorder_template_categories", { templateId, orderedIds });
};

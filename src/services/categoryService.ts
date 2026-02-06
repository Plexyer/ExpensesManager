import { invoke } from "@tauri-apps/api/core";
import type { GlobalCategory, CreateGlobalCategoryArgs } from "../types/category.types";

/**
 * Creates a new global category.
 *
 * @param args - Category creation arguments
 * @returns The created category
 * @throws Error if no database is open or name is duplicate
 */
export const createGlobalCategory = async (
  args: CreateGlobalCategoryArgs
): Promise<GlobalCategory> => {
  return await invoke<GlobalCategory>("create_global_category", { args });
};

/**
 * Lists all global categories.
 *
 * @returns Array of all global categories, sorted by name
 * @throws Error if no database is open
 */
export const listGlobalCategories = async (): Promise<GlobalCategory[]> => {
  return await invoke<GlobalCategory[]>("list_global_categories");
};

/**
 * Deletes a global category.
 * Fails if the category is used in any template.
 *
 * @param globalCategoryId - The ID of the category to delete
 * @throws Error if category is in use or not found
 */
export const deleteGlobalCategory = async (
  globalCategoryId: number
): Promise<void> => {
  await invoke("delete_global_category", { globalCategoryId });
};

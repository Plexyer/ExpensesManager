/**
 * Type definitions for global categories.
 */

/**
 * A global category definition.
 */
export interface GlobalCategory {
  global_category_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Arguments for creating a global category.
 */
export interface CreateGlobalCategoryArgs {
  name: string;
  description?: string | null;
}

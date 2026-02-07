import { invoke } from "@tauri-apps/api/core";
import type {
  PeriodBudgetInstance,
  CreatePeriodFromTemplateArgs,
  CreatePeriodResult,
} from "../types/period.types";

// ============================================================================
// Period Budget Instance Operations
// ============================================================================

/**
 * Creates a new period budget instance from a template.
 *
 * This command:
 * 1. Reads the template's cadence and default currency
 * 2. Computes end_date from cadence (unless custom, where user provides it)
 * 3. Creates the period row
 * 4. Copies all template categories into budget instance categories
 * 5. Auto-creates 'received' template-default line items for categories with allocated_amount > 0
 *
 * @param args - Template ID, start date, optional end date and income arrival date
 * @returns The created period, plus counts of categories and default line items created
 * @throws Error if template not found or no database is open
 */
export const createPeriodFromTemplate = async (
  args: CreatePeriodFromTemplateArgs
): Promise<CreatePeriodResult> => {
  return await invoke<CreatePeriodResult>("create_period_from_template", {
    args,
  });
};

/**
 * Lists all period budget instances, ordered by start_date DESC.
 *
 * @returns Array of all periods with joined template names
 * @throws Error if no database is open
 */
export const listPeriods = async (): Promise<PeriodBudgetInstance[]> => {
  return await invoke<PeriodBudgetInstance[]>("list_periods");
};

/**
 * Gets a single period budget instance by ID.
 *
 * @param budgetInstanceId - The ID of the period to get
 * @returns The period instance with joined template name
 * @throws Error if not found or no database is open
 */
export const getPeriod = async (
  budgetInstanceId: number
): Promise<PeriodBudgetInstance> => {
  return await invoke<PeriodBudgetInstance>("get_period", {
    budgetInstanceId,
  });
};

/**
 * Deletes a period budget instance by ID.
 * CASCADE removes associated budget_instance_categories and category_line_items.
 *
 * @param budgetInstanceId - The ID of the period to delete
 * @throws Error if not found or no database is open
 */
export const deletePeriod = async (
  budgetInstanceId: number
): Promise<void> => {
  await invoke("delete_period", { budgetInstanceId });
};

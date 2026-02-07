/**
 * Type definitions for period budget instances.
 */

import type { Cadence } from "./template.types";

/**
 * A period budget instance (one grid view per period).
 */
export interface PeriodBudgetInstance {
  budget_instance_id: number;
  cadence: Cadence;
  start_date: string;
  end_date: string | null;
  template_id: number | null;
  template_name: string | null;
  income_arrival_date: string | null;
  created_at: string;
}

/**
 * Arguments for creating a period from a template.
 */
export interface CreatePeriodFromTemplateArgs {
  template_id: number;
  start_date: string;
  /** Optional end_date — required for 'custom' cadence, computed otherwise. */
  end_date?: string | null;
  /** Optional income arrival date for the period. */
  income_arrival_date?: string | null;
}

/**
 * Result of creating a period from a template.
 */
export interface CreatePeriodResult {
  period: PeriodBudgetInstance;
  /** Number of category envelopes copied from the template. */
  categories_created: number;
  /** Number of template-default received line items auto-created. */
  default_line_items_created: number;
}

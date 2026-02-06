/**
 * Type definitions for budget templates.
 */

/**
 * Valid cadence options for budget templates.
 */
export type Cadence = 'monthly' | 'biweekly' | 'weekly' | 'daily' | 'yearly' | 'custom';

/**
 * Cadence display options for UI dropdowns.
 */
export const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Valid currency options for MVP.
 */
export type Currency = 'CHF' | 'EUR';

/**
 * Currency display options for UI dropdowns.
 */
export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'CHF', label: 'CHF (Swiss Franc)' },
  { value: 'EUR', label: 'EUR (Euro)' },
];

/**
 * A budget template definition.
 */
export interface Template {
  template_id: number;
  name: string;
  description: string | null;
  cadence: Cadence;
  default_currency: Currency;
  created_at: string;
  updated_at: string;
}

/**
 * Arguments for creating a template.
 */
export interface CreateTemplateArgs {
  name: string;
  description?: string | null;
  cadence: Cadence;
  default_currency: Currency;
}

/**
 * Arguments for updating a template.
 */
export interface UpdateTemplateArgs {
  name: string;
  description?: string | null;
  cadence: Cadence;
  default_currency: Currency;
}

/**
 * A category linked to a template with its default amount.
 */
export interface TemplateCategory {
  template_category_id: number;
  global_category_id: number;
  category_name: string;
  allocated_amount: number;
  category_type: string;
  sort_order: number;
}

/**
 * Arguments for adding a category to a template.
 */
export interface AddTemplateCategoryArgs {
  template_id: number;
  global_category_id: number;
  allocated_amount: number;
  category_type?: string;
}

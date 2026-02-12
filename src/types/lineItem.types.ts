/**
 * Type definitions for category line items (received / spent transactions).
 */

/**
 * A single line item (received or spent) for a category within a budget instance.
 * Matches the Rust `LineItem` struct returned by the `list_line_items` command.
 */
export interface LineItem {
  line_item_id: number;
  budget_instance_category_id: number;
  kind: "received" | "spent";
  /** ISO 8601 datetime string, e.g. "2026-02-01T00:00:00" */
  occurred_at: string;
  description: string | null;
  amount: number;
  /** Currency code, e.g. "CHF" */
  currency: string;
  notes: string | null;
  is_template_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Arguments for creating a new line item.
 * Matches the Rust `CreateLineItemArgs` struct.
 */
export interface CreateLineItemArgs {
  budget_instance_category_id: number;
  kind: "received" | "spent";
  /** ISO 8601 datetime string */
  occurred_at: string;
  amount: number;
  /** Currency code, e.g. "CHF" */
  currency: string;
  description?: string | null;
  notes?: string | null;
}

/**
 * Arguments for updating an existing line item.
 * Matches the Rust `UpdateLineItemArgs` struct.
 */
export interface UpdateLineItemArgs {
  line_item_id: number;
  /** ISO 8601 datetime string */
  occurred_at: string;
  amount: number;
  description?: string | null;
  notes?: string | null;
}

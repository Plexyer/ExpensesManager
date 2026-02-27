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

/**
 * Arguments for listing global recent transactions feed entries.
 * Matches Rust `ListRecentTransactionsFeedArgs`.
 */
export interface ListRecentTransactionsFeedArgs {
  limit?: number;
  offset?: number;
}

/**
 * A recent transaction entry across periods/categories with joined context
 * for dashboard activity use-cases.
 */
export interface RecentTransactionFeedItem {
  line_item_id: number;
  budget_instance_category_id: number;
  budget_instance_id: number;
  global_category_id: number;
  category_name: string;
  period_start_date: string;
  period_end_date: string | null;
  template_name: string | null;
  kind: "received" | "spent";
  occurred_at: string;
  description: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  is_template_default: boolean;
  created_at: string;
  updated_at: string;
}

export type DashboardTimeSeriesGranularity = "daily" | "weekly" | "period";

export interface ListDashboardTimeSeriesArgs {
  granularity: DashboardTimeSeriesGranularity;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface DashboardTimeSeriesBucket {
  bucket_key: string;
  bucket_label: string;
  bucket_start_date: string;
  bucket_end_date: string | null;
  received_total: number;
  spent_total: number;
  net_total: number;
  currency: string;
}

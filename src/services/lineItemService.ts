import { invoke } from "@tauri-apps/api/core";
import type {
  LineItem,
  CreateLineItemArgs,
  UpdateLineItemArgs,
  ListRecentTransactionsFeedArgs,
  RecentTransactionFeedItem,
  ListDashboardTimeSeriesArgs,
  DashboardTimeSeriesBucket,
} from "../types/lineItem.types";

// ============================================================================
// Line Item Operations
// ============================================================================

/**
 * Lists line items for a specific category within a budget instance, filtered by kind.
 * Returns non-deleted items ordered by occurred_at descending.
 *
 * @param budgetInstanceCategoryId - The budget_instance_category PK
 * @param kind - "received" or "spent"
 * @returns Array of line items
 * @throws Error if no database is open
 */
export const listLineItems = async (
  budgetInstanceCategoryId: number,
  kind: "received" | "spent"
): Promise<LineItem[]> => {
  return await invoke<LineItem[]>("list_line_items", {
    budgetInstanceCategoryId,
    kind,
  });
};

/**
 * Lists globally recent transactions across periods/categories for dashboard
 * activity feeds.
 *
 * @param args - Optional paging args (`limit`, `offset`)
 * @returns Array of recent transaction rows with joined context
 * @throws Error if no database is open or args are invalid
 */
export const listRecentTransactionsFeed = async (
  args?: ListRecentTransactionsFeedArgs
): Promise<RecentTransactionFeedItem[]> => {
  return await invoke<RecentTransactionFeedItem[]>("list_recent_transactions_feed", {
    args: args ?? {},
  });
};

/**
 * Lists aggregate dashboard time-series buckets for trend and timeline widgets.
 *
 * @param args - Granularity + optional range and limit controls
 * @returns Aggregate buckets with received/spent/net totals
 * @throws Error if no database is open or args are invalid
 */
export const listDashboardTimeSeries = async (
  args: ListDashboardTimeSeriesArgs
): Promise<DashboardTimeSeriesBucket[]> => {
  return await invoke<DashboardTimeSeriesBucket[]>("list_dashboard_time_series", {
    args,
  });
};

/**
 * Creates a new line item (received or spent) for a category.
 * Returns the created LineItem with server-generated fields (id, timestamps).
 *
 * @param args - The line item data to create
 * @returns The created line item
 * @throws Error if validation fails or no database is open
 */
export const createLineItem = async (
  args: CreateLineItemArgs
): Promise<LineItem> => {
  return await invoke<LineItem>("create_line_item", { args });
};

/**
 * Updates an existing line item's mutable fields (date, description, amount, notes).
 * Returns the updated LineItem.
 *
 * @param args - The fields to update (must include line_item_id)
 * @returns The updated line item
 * @throws Error if item not found, already deleted, validation fails, or no database is open
 */
export const updateLineItem = async (
  args: UpdateLineItemArgs
): Promise<LineItem> => {
  return await invoke<LineItem>("update_line_item", { args });
};

/**
 * Soft-deletes a line item by setting its `deleted_at` timestamp.
 *
 * @param lineItemId - The line_item_id to delete
 * @throws Error if item not found, already deleted, or no database is open
 */
export const deleteLineItem = async (lineItemId: number): Promise<void> => {
  return await invoke<void>("delete_line_item", { lineItemId });
};

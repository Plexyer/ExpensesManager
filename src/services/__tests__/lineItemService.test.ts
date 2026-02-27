import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listRecentTransactionsFeed } from "../lineItemService";
import type { RecentTransactionFeedItem } from "../../types/lineItem.types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("lineItemService", () => {
  it("lists recent transaction feed with provided paging args", async () => {
    const rows: RecentTransactionFeedItem[] = [
      {
        line_item_id: 1,
        budget_instance_category_id: 10,
        budget_instance_id: 100,
        global_category_id: 1000,
        category_name: "Groceries",
        period_start_date: "2026-02-01",
        period_end_date: "2026-02-28",
        template_name: "Monthly Budget",
        kind: "spent",
        occurred_at: "2026-02-18T12:00:00",
        description: "Lunch",
        amount: 25,
        currency: "CHF",
        notes: null,
        is_template_default: false,
        created_at: "2026-02-18T12:00:00",
        updated_at: "2026-02-18T12:00:00",
      },
    ];
    mockInvoke.mockResolvedValueOnce(rows);

    const result = await listRecentTransactionsFeed({ limit: 10, offset: 5 });

    expect(result).toEqual(rows);
    expect(mockInvoke).toHaveBeenCalledWith("list_recent_transactions_feed", {
      args: { limit: 10, offset: 5 },
    });
  });

  it("uses empty args object when paging args are omitted", async () => {
    mockInvoke.mockResolvedValueOnce([]);

    const result = await listRecentTransactionsFeed();

    expect(result).toEqual([]);
    expect(mockInvoke).toHaveBeenCalledWith("list_recent_transactions_feed", {
      args: {},
    });
  });
});

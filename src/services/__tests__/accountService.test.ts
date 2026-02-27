import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  createFinancialAccount,
  getNetWorthSnapshot,
  listFinancialAccounts,
  upsertAccountBalanceSnapshot,
} from "../accountService";
import type {
  AccountBalanceSnapshot,
  FinancialAccount,
  NetWorthSnapshot,
} from "../../types/account.types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("accountService", () => {
  it("creates a financial account via invoke", async () => {
    const account: FinancialAccount = {
      account_id: 1,
      name: "Savings",
      account_type: "asset",
      currency: "CHF",
      is_active: true,
      display_order: 0,
      created_at: "2026-02-26T10:00:00Z",
      updated_at: "2026-02-26T10:00:00Z",
    };
    mockInvoke.mockResolvedValueOnce(account);

    const result = await createFinancialAccount({
      name: "Savings",
      account_type: "asset",
      currency: "CHF",
    });

    expect(result).toEqual(account);
    expect(mockInvoke).toHaveBeenCalledWith("create_financial_account", {
      args: {
        name: "Savings",
        account_type: "asset",
        currency: "CHF",
      },
    });
  });

  it("lists financial accounts via invoke", async () => {
    const accounts: FinancialAccount[] = [
      {
        account_id: 1,
        name: "Checking",
        account_type: "asset",
        currency: "CHF",
        is_active: true,
        display_order: 0,
        created_at: "2026-02-26T10:00:00Z",
        updated_at: "2026-02-26T10:00:00Z",
      },
    ];
    mockInvoke.mockResolvedValueOnce(accounts);

    const result = await listFinancialAccounts();

    expect(result).toEqual(accounts);
    expect(mockInvoke).toHaveBeenCalledWith("list_financial_accounts");
  });

  it("upserts account balance snapshot via invoke", async () => {
    const snapshot: AccountBalanceSnapshot = {
      snapshot_id: 1,
      account_id: 1,
      as_of_date: "2026-02-26",
      balance_amount: 1500,
      note: null,
      created_at: "2026-02-26T10:00:00Z",
      updated_at: "2026-02-26T10:00:00Z",
    };
    mockInvoke.mockResolvedValueOnce(snapshot);

    const result = await upsertAccountBalanceSnapshot({
      account_id: 1,
      as_of_date: "2026-02-26",
      balance_amount: 1500,
    });

    expect(result).toEqual(snapshot);
    expect(mockInvoke).toHaveBeenCalledWith("upsert_account_balance_snapshot", {
      args: {
        account_id: 1,
        as_of_date: "2026-02-26",
        balance_amount: 1500,
      },
    });
  });

  it("requests net worth snapshot with optional as-of date", async () => {
    const netWorth: NetWorthSnapshot = {
      as_of_date: "2026-02-26",
      account_balances: [],
      totals_by_currency: [],
    };
    mockInvoke.mockResolvedValueOnce(netWorth);

    const withDate = await getNetWorthSnapshot("2026-02-26");
    expect(withDate).toEqual(netWorth);
    expect(mockInvoke).toHaveBeenCalledWith("get_net_worth_snapshot", {
      asOfDate: "2026-02-26",
    });

    mockInvoke.mockResolvedValueOnce(netWorth);
    const withoutDate = await getNetWorthSnapshot();
    expect(withoutDate).toEqual(netWorth);
    expect(mockInvoke).toHaveBeenCalledWith("get_net_worth_snapshot", {
      asOfDate: null,
    });
  });
});

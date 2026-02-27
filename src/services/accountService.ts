import { invoke } from "@tauri-apps/api/core";
import type {
  AccountBalanceSnapshot,
  CreateFinancialAccountArgs,
  FinancialAccount,
  NetWorthSnapshot,
  UpsertAccountBalanceSnapshotArgs,
} from "../types/account.types";

export const createFinancialAccount = async (
  args: CreateFinancialAccountArgs
): Promise<FinancialAccount> => {
  return await invoke<FinancialAccount>("create_financial_account", { args });
};

export const listFinancialAccounts = async (): Promise<FinancialAccount[]> => {
  return await invoke<FinancialAccount[]>("list_financial_accounts");
};

export const upsertAccountBalanceSnapshot = async (
  args: UpsertAccountBalanceSnapshotArgs
): Promise<AccountBalanceSnapshot> => {
  return await invoke<AccountBalanceSnapshot>("upsert_account_balance_snapshot", {
    args,
  });
};

export const getNetWorthSnapshot = async (
  asOfDate?: string
): Promise<NetWorthSnapshot> => {
  return await invoke<NetWorthSnapshot>("get_net_worth_snapshot", {
    asOfDate: asOfDate ?? null,
  });
};

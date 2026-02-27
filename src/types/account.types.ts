export type FinancialAccountType = "asset" | "liability";

export interface FinancialAccount {
  account_id: number;
  name: string;
  account_type: FinancialAccountType;
  currency: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFinancialAccountArgs {
  name: string;
  account_type: FinancialAccountType;
  currency: string;
  display_order?: number;
  is_active?: boolean;
}

export interface AccountBalanceSnapshot {
  snapshot_id: number;
  account_id: number;
  as_of_date: string;
  balance_amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertAccountBalanceSnapshotArgs {
  account_id: number;
  as_of_date: string;
  balance_amount: number;
  note?: string | null;
}

export interface NetWorthAccountBalance {
  account_id: number;
  name: string;
  account_type: FinancialAccountType;
  currency: string;
  as_of_date: string | null;
  balance_amount: number;
  signed_balance_amount: number;
}

export interface NetWorthCurrencyTotal {
  currency: string;
  assets_total: number;
  liabilities_total: number;
  net_total: number;
}

export interface NetWorthSnapshot {
  as_of_date: string;
  account_balances: NetWorthAccountBalance[];
  totals_by_currency: NetWorthCurrencyTotal[];
}

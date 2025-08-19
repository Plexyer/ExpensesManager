import { invoke } from "@tauri-apps/api/core";
import { MonthlyBudget } from "../store/slices/budgetSlice";

export async function initDatabase(): Promise<void> {
  await invoke("init_database");
}

export async function createMonthlyBudget(month: number, year: number, totalIncome: number): Promise<number> {
  const id = await invoke<number>("create_monthly_budget", {
    args: { month, year, totalIncome },
  } as any);
  return id;
}

export async function listMonthlyBudgets(): Promise<MonthlyBudget[]> {
  const rows = await invoke<Array<{ budget_id: number; month: number; year: number; total_income: number }>>(
    "list_monthly_budgets",
  );
  return rows.map((r) => ({
    budgetId: r.budget_id,
    month: r.month,
    year: r.year,
    totalIncome: r.total_income,
  }));
}



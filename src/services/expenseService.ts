import { invoke } from "@tauri-apps/api/core";
import { ExpenseItem } from "../store/slices/expenseSlice";

export async function addExpense(
  allocationId: number,
  amount: number,
  description: string,
  date: string,
  location?: string,
): Promise<number> {
  const id = await invoke<number>("add_expense", {
    args: { allocationId, amount, description, date, location },
  } as any);
  return id;
}

export async function listExpenses(allocationId: number): Promise<ExpenseItem[]> {
  const rows = await invoke<Array<{ expense_id: number; allocation_id: number; amount: number; description: string; date: string; location?: string | null }>>(
    "list_expenses",
    { allocationId },
  );
  return rows.map((r) => ({
    expenseId: r.expense_id,
    allocationId: r.allocation_id,
    amount: r.amount,
    description: r.description,
    date: r.date,
    location: r.location ?? undefined,
  }));
}



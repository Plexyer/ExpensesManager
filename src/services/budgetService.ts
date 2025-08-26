import { invoke } from "@tauri-apps/api/core";
import { MonthlyBudget } from "../store/slices/budgetSlice";

export async function initDatabase(): Promise<void> {
  await invoke("init_database");
}

export async function createMonthlyBudget(month: number, year: number, totalIncome: number, name?: string): Promise<number> {
  console.log("budgetService.createMonthlyBudget called with:", { month, year, totalIncome, name });
  
  try {
    const args = { month, year, totalIncome, name };
    console.log("Invoking Tauri command 'create_monthly_budget' with args:", { args });
    console.log("Args type check - month:", typeof month, "year:", typeof year, "totalIncome:", typeof totalIncome, "name:", typeof name);
    
    const id = await invoke<number>("create_monthly_budget", { args });
    
    console.log("Successfully created budget with ID:", id);
    return id;
  } catch (error) {
    console.error("Error in createMonthlyBudget service:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error;
  }
}

export async function listMonthlyBudgets(): Promise<MonthlyBudget[]> {
  const rows = await invoke<Array<{ 
    budget_id: number; 
    month: number; 
    year: number; 
    total_income: number;
    created_at: string;
    finished_at?: string;
    first_finished_at?: string;
    name?: string;
    last_edited: string;
  }>>("list_monthly_budgets");
  return rows.map((r) => ({
    budgetId: r.budget_id,
    month: r.month,
    year: r.year,
    totalIncome: r.total_income,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
    firstFinishedAt: r.first_finished_at,
    name: r.name,
    lastEdited: r.last_edited,
  }));
}

export interface SortCriteria {
  criteria: 'income' | 'created_date' | 'finished_date' | 'budget_date' | 'name' | 'last_edited';
  ascending: boolean;
}

export async function listMonthlyBudgetsSorted(sort: SortCriteria): Promise<MonthlyBudget[]> {
  const rows = await invoke<Array<{ 
    budget_id: number; 
    month: number; 
    year: number; 
    total_income: number;
    created_at: string;
    finished_at?: string;
    first_finished_at?: string;
    name?: string;
    last_edited: string;
  }>>("list_monthly_budgets_sorted", { args: sort });
  return rows.map((r) => ({
    budgetId: r.budget_id,
    month: r.month,
    year: r.year,
    totalIncome: r.total_income,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
    firstFinishedAt: r.first_finished_at,
    name: r.name,
    lastEdited: r.last_edited,
  }));
}

export async function forceSeedExamples(): Promise<void> {
  await invoke("force_seed_examples");
}

export async function deleteMonthlyBudget(budgetId: number): Promise<void> {
  console.log("budgetService.deleteMonthlyBudget called with ID:", budgetId);
  
  try {
    console.log("Invoking Tauri command 'delete_monthly_budget' with budget ID:", budgetId);
    
    await invoke<void>("delete_monthly_budget", { budgetId });
    
    console.log("Successfully deleted budget with ID:", budgetId);
  } catch (error) {
    console.error("Error in deleteMonthlyBudget service:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error;
  }
}

export async function finishMonthlyBudget(budgetId: number): Promise<void> {
  console.log("budgetService.finishMonthlyBudget called with ID:", budgetId);
  
  try {
    console.log("Invoking Tauri command 'finish_monthly_budget' with budget ID:", budgetId);
    
    await invoke<void>("finish_monthly_budget", { budgetId });
    
    console.log("Successfully finished budget with ID:", budgetId);
  } catch (error) {
    console.error("Error in finishMonthlyBudget service:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error;
  }
}

export async function unfinishMonthlyBudget(budgetId: number): Promise<void> {
  console.log("budgetService.unfinishMonthlyBudget called with ID:", budgetId);
  
  try {
    console.log("Invoking Tauri command 'unfinish_monthly_budget' with budget ID:", budgetId);
    
    await invoke<void>("unfinish_monthly_budget", { budgetId });
    
    console.log("Successfully unfinished budget with ID:", budgetId);
  } catch (error) {
    console.error("Error in unfinishMonthlyBudget service:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error;
  }
}

export interface BudgetChangeHistoryEntry {
  changeId: number;
  budgetId: number;
  changeType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changeDescription: string;
  changedAt: string;
}

export async function getBudgetChangeHistory(budgetId: number): Promise<BudgetChangeHistoryEntry[]> {
  console.log("budgetService.getBudgetChangeHistory called with ID:", budgetId);
  
  try {
    const rows = await invoke<Array<{
      changeId: number;
      budgetId: number;
      changeType: string;
      fieldName?: string;
      oldValue?: string;
      newValue?: string;
      changeDescription: string;
      changedAt: string;
    }>>("get_budget_change_history", { budgetId });
    
    console.log("🔧 Raw backend response:", rows);
    console.log("🔧 First raw entry:", rows[0]);
    
    // The backend already sends camelCase, so we can return directly
    return rows;
  } catch (error) {
    console.error("Error in getBudgetChangeHistory service:", error);
    throw error;
  }
}

export async function updateBudgetTitle(budgetId: number, title: string): Promise<void> {
  console.log("budgetService.updateBudgetTitle called with:", { budgetId, title });
  
  try {
    await invoke("update_budget_title", { budgetId, title });
  } catch (error) {
    console.error("Error in updateBudgetTitle service:", error);
    throw error;
  }
}

export async function getLastFinishedDate(budgetId: number): Promise<string | null> {
  try {
    const history = await getBudgetChangeHistory(budgetId);
    
    // Find the most recent "finished" action (not reopened)
    const finishedActions = history.filter(entry => 
      entry.changeType === 'status_change' && 
      entry.changeDescription.includes('finished') &&
      !entry.changeDescription.includes('reopened')
    );
    
    if (finishedActions.length === 0) {
      return null; // Never finished
    }
    
    // History is already sorted by most recent first, so take the first finished action
    return finishedActions[0].changedAt;
  } catch (error) {
    console.error("Error getting last finished date:", error);
    return null;
  }
}





import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MonthlyBudget {
  budgetId: number;
  month: number;
  year: number;
  totalIncome: number;
  createdAt: string;
  finishedAt?: string;
  firstFinishedAt?: string;
  name?: string;
  lastEdited: string;
}

interface BudgetState {
  budgets: MonthlyBudget[];
  currentBudgetId: number | null;
}

const initialState: BudgetState = {
  budgets: [],
  currentBudgetId: null,
};

const budgetSlice = createSlice({
  name: "budget",
  initialState,
  reducers: {
    setBudgets(state: BudgetState, action: PayloadAction<MonthlyBudget[]>) {
      state.budgets = action.payload;
    },
    setCurrentBudget(state: BudgetState, action: PayloadAction<number | null>) {
      state.currentBudgetId = action.payload;
    },
    addBudget(state: BudgetState, action: PayloadAction<MonthlyBudget>) {
      state.budgets.unshift(action.payload);
      state.currentBudgetId = action.payload.budgetId;
    },
    finishBudget(state: BudgetState, action: PayloadAction<{ budgetId: number; finishedAt: string; firstFinishedAt?: string; lastEdited: string }>) {
      const budget = state.budgets.find(b => b.budgetId === action.payload.budgetId);
      if (budget) {
        budget.finishedAt = action.payload.finishedAt;
        budget.lastEdited = action.payload.lastEdited;
        // Only set firstFinishedAt if it's provided (first time finishing)
        if (action.payload.firstFinishedAt) {
          budget.firstFinishedAt = action.payload.firstFinishedAt;
        }
      }
    },
    unfinishBudget(state: BudgetState, action: PayloadAction<{ budgetId: number; lastEdited: string }>) {
      const budget = state.budgets.find(b => b.budgetId === action.payload.budgetId);
      if (budget) {
        budget.finishedAt = undefined;
        budget.lastEdited = action.payload.lastEdited;
      }
    },
    updateBudgetTitle(state: BudgetState, action: PayloadAction<{ budgetId: number; name: string; lastEdited: string }>) {
      const budget = state.budgets.find(b => b.budgetId === action.payload.budgetId);
      if (budget) {
        budget.name = action.payload.name;
        budget.lastEdited = action.payload.lastEdited;
      }
    },
  },
});

export const { setBudgets, setCurrentBudget, addBudget, finishBudget, unfinishBudget, updateBudgetTitle } = budgetSlice.actions;
export default budgetSlice.reducer;



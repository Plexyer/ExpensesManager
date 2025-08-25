import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MonthlyBudget {
  budgetId: number;
  month: number;
  year: number;
  totalIncome: number;
  createdAt: string;
  finishedAt?: string;
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
  },
});

export const { setBudgets, setCurrentBudget, addBudget } = budgetSlice.actions;
export default budgetSlice.reducer;



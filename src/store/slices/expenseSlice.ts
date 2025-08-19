import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ExpenseItem {
  expenseId: number;
  allocationId: number;
  amount: number;
  description: string;
  date: string;
  location?: string | null;
}

interface ExpenseState {
  byAllocationId: Record<number, ExpenseItem[]>;
}

const initialState: ExpenseState = {
  byAllocationId: {},
};

const expenseSlice = createSlice({
  name: "expense",
  initialState,
  reducers: {
    setExpensesForAllocation(
      state,
      action: PayloadAction<{ allocationId: number; items: ExpenseItem[] }>,
    ) {
      state.byAllocationId[action.payload.allocationId] = action.payload.items;
    },
    addExpenseToAllocation(
      state,
      action: PayloadAction<{ allocationId: number; item: ExpenseItem }>,
    ) {
      const list = state.byAllocationId[action.payload.allocationId] || [];
      state.byAllocationId[action.payload.allocationId] = [
        action.payload.item,
        ...list,
      ];
    },
  },
});

export const { setExpensesForAllocation, addExpenseToAllocation } = expenseSlice.actions;
export default expenseSlice.reducer;



import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice.ts";
import budgetReducer from "./slices/budgetSlice.ts";
import expenseReducer from "./slices/expenseSlice.ts";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    budget: budgetReducer,
    expense: expenseReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;



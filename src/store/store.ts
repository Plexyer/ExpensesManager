import { configureStore } from "@reduxjs/toolkit";
import fileReducer from "./slices/fileSlice";
import categoryReducer from "./slices/categorySlice";
import templateReducer from "./slices/templateSlice";
import budgetReducer from "./slices/budgetSlice";

export const store = configureStore({
  reducer: {
    file: fileReducer,
    categories: categoryReducer,
    templates: templateReducer,
    budget: budgetReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

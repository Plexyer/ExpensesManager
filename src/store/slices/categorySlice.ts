import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { GlobalCategory, CreateGlobalCategoryArgs } from "../../types/category.types";
import {
  createGlobalCategory as apiCreateCategory,
  listGlobalCategories as apiListCategories,
  deleteGlobalCategory as apiDeleteCategory,
} from "../../services/categoryService";

/**
 * Helper to extract error message from Tauri invoke errors.
 * Tauri returns errors as strings, not Error objects.
 */
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

interface CategoryState {
  categories: GlobalCategory[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  "categories/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await apiListCategories();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch categories"));
    }
  }
);

export const createCategory = createAsyncThunk(
  "categories/create",
  async (args: CreateGlobalCategoryArgs, { rejectWithValue }) => {
    try {
      return await apiCreateCategory(args);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to create category"));
    }
  }
);

export const deleteCategory = createAsyncThunk(
  "categories/delete",
  async (categoryId: number, { rejectWithValue }) => {
    try {
      await apiDeleteCategory(categoryId);
      return categoryId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to delete category"));
    }
  }
);

const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    clearCategoryError: (state) => {
      state.error = null;
    },
    resetCategories: (state) => {
      state.categories = [];
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create category
    builder
      .addCase(createCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories.push(action.payload);
        // Re-sort by name
        state.categories.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete category
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = state.categories.filter(
          (c) => c.global_category_id !== action.payload
        );
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCategoryError, resetCategories } = categorySlice.actions;
export default categorySlice.reducer;

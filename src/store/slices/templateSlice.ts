import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  Template,
  CreateTemplateArgs,
  UpdateTemplateArgs,
  TemplateCategory,
  AddTemplateCategoryArgs,
} from "../../types/template.types";
import {
  createTemplate as apiCreateTemplate,
  listTemplates as apiListTemplates,
  getTemplate as apiGetTemplate,
  updateTemplate as apiUpdateTemplate,
  deleteTemplate as apiDeleteTemplate,
  getTemplateCategories as apiGetCategories,
  addCategoryToTemplate as apiAddCategory,
  removeCategoryFromTemplate as apiRemoveCategory,
  updateTemplateCategoryAmount as apiUpdateAmount,
} from "../../services/templateService";

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

interface TemplateState {
  templates: Template[];
  selectedTemplate: Template | null;
  templateCategories: TemplateCategory[];
  isLoading: boolean;
  isCategoriesLoading: boolean; // Separate loading state for categories
  error: string | null;
}

const initialState: TemplateState = {
  templates: [],
  selectedTemplate: null,
  templateCategories: [],
  isLoading: false,
  isCategoriesLoading: false,
  error: null,
};

// Async thunks - Templates
export const fetchTemplates = createAsyncThunk(
  "templates/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await apiListTemplates();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch templates"));
    }
  }
);

export const fetchTemplate = createAsyncThunk(
  "templates/fetchOne",
  async (templateId: number, { rejectWithValue }) => {
    try {
      return await apiGetTemplate(templateId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch template"));
    }
  }
);

export const createTemplate = createAsyncThunk(
  "templates/create",
  async (args: CreateTemplateArgs, { rejectWithValue }) => {
    try {
      return await apiCreateTemplate(args);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to create template"));
    }
  }
);

export const updateTemplate = createAsyncThunk(
  "templates/update",
  async ({ templateId, args }: { templateId: number; args: UpdateTemplateArgs }, { rejectWithValue }) => {
    try {
      return await apiUpdateTemplate(templateId, args);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to update template"));
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "templates/delete",
  async (templateId: number, { rejectWithValue }) => {
    try {
      await apiDeleteTemplate(templateId);
      return templateId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to delete template"));
    }
  }
);

// Async thunks - Template Categories
export const fetchTemplateCategories = createAsyncThunk(
  "templates/fetchCategories",
  async (templateId: number, { rejectWithValue }) => {
    try {
      return await apiGetCategories(templateId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch template categories"));
    }
  }
);

export const addCategoryToTemplate = createAsyncThunk(
  "templates/addCategory",
  async (args: AddTemplateCategoryArgs, { rejectWithValue }) => {
    try {
      return await apiAddCategory(args);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to add category"));
    }
  }
);

export const removeCategoryFromTemplate = createAsyncThunk(
  "templates/removeCategory",
  async (templateCategoryId: number, { rejectWithValue }) => {
    try {
      await apiRemoveCategory(templateCategoryId);
      return templateCategoryId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to remove category"));
    }
  }
);

export const updateTemplateCategoryAmount = createAsyncThunk(
  "templates/updateCategoryAmount",
  async ({ templateCategoryId, allocatedAmount }: { templateCategoryId: number; allocatedAmount: number }, { rejectWithValue }) => {
    try {
      await apiUpdateAmount(templateCategoryId, allocatedAmount);
      return { templateCategoryId, allocatedAmount };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to update amount"));
    }
  }
);

const templateSlice = createSlice({
  name: "templates",
  initialState,
  reducers: {
    clearTemplateError: (state) => {
      state.error = null;
    },
    resetTemplates: (state) => {
      state.templates = [];
      state.selectedTemplate = null;
      state.templateCategories = [];
      state.isLoading = false;
      state.error = null;
    },
    selectTemplate: (state, action: PayloadAction<Template | null>) => {
      const next = action.payload;
      const sameSelection = state.selectedTemplate?.template_id === next?.template_id;
      state.selectedTemplate = next;
      // Keep old categories visible during loading (prevents flickering)
      // They will be replaced when fetchTemplateCategories.fulfilled runs
      state.error = null; // Clear any stale errors
      // Only set loading when selection actually changed; re-selecting the same template
      // would otherwise set loading true but the useEffect (same selectedTemplate ref) won't
      // re-run, so the fetch never fires and loading never clears.
      state.isCategoriesLoading = next !== null && !sameSelection;
    },
  },
  extraReducers: (builder) => {
    // Fetch all templates
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single template
    builder
      .addCase(fetchTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedTemplate = action.payload;
      })
      .addCase(fetchTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create template
    builder
      .addCase(createTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates.push(action.payload);
        state.templates.sort((a, b) => a.name.localeCompare(b.name));
        state.selectedTemplate = action.payload;
        state.templateCategories = []; // New template has no categories
        state.error = null; // Clear any stale errors
      })
      .addCase(createTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update template
    builder
      .addCase(updateTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.templates.findIndex(t => t.template_id === action.payload.template_id);
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
        state.selectedTemplate = action.payload;
        state.templates.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete template
    builder
      .addCase(deleteTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates = state.templates.filter(t => t.template_id !== action.payload);
        if (state.selectedTemplate?.template_id === action.payload) {
          state.selectedTemplate = null;
          state.templateCategories = [];
        }
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch template categories - uses separate loading state and stale response filtering
    builder
      .addCase(fetchTemplateCategories.pending, (state) => {
        state.isCategoriesLoading = true;
        // Don't clear error here - let stale errors persist until successful fetch
      })
      .addCase(fetchTemplateCategories.fulfilled, (state, action) => {
        state.isCategoriesLoading = false;
        // Only apply if this response is for the currently selected template
        // action.meta.arg contains the templateId that was passed to the thunk
        if (state.selectedTemplate?.template_id === action.meta.arg) {
          state.templateCategories = action.payload;
          // Clear any previous error since fetch succeeded
          state.error = null;
        }
        // Otherwise, ignore stale response
      })
      .addCase(fetchTemplateCategories.rejected, (state, action) => {
        state.isCategoriesLoading = false;
        // Only show error if this is for the currently selected template
        if (state.selectedTemplate?.template_id === action.meta.arg) {
          state.error = action.payload as string;
        }
        // Otherwise, ignore stale error
      });

    // Add category to template
    builder
      .addCase(addCategoryToTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addCategoryToTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templateCategories.push(action.payload);
      })
      .addCase(addCategoryToTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Remove category from template
    builder
      .addCase(removeCategoryFromTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeCategoryFromTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templateCategories = state.templateCategories.filter(
          tc => tc.template_category_id !== action.payload
        );
      })
      .addCase(removeCategoryFromTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update category amount
    builder
      .addCase(updateTemplateCategoryAmount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTemplateCategoryAmount.fulfilled, (state, action) => {
        state.isLoading = false;
        const tc = state.templateCategories.find(
          c => c.template_category_id === action.payload.templateCategoryId
        );
        if (tc) {
          tc.allocated_amount = action.payload.allocatedAmount;
        }
      })
      .addCase(updateTemplateCategoryAmount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTemplateError, resetTemplates, selectTemplate } = templateSlice.actions;
export default templateSlice.reducer;

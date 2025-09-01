import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { invoke } from "@tauri-apps/api/core";
import { CategoryStats, LedgerEntry, NewEntry, UpdateEntry, BudgetTemplate, NewCategory } from "../../types/budget";

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

export type ColumnId = 'allocated' | 'net' | 'remaining' | 'lastActivity' | 'entries';

interface BudgetState {
  budgets: MonthlyBudget[];
  currentBudgetId: number | null;
  categories: CategoryStats[];
  visibleColumnIds: ColumnId[];
  ledgerByCategoryId: Record<number, LedgerEntry[]>;
  templates: BudgetTemplate[];
  loading: boolean;
  error?: string;
}

// Load visible columns from localStorage
const loadVisibleColumns = (): ColumnId[] => {
  try {
    const saved = localStorage.getItem('budget.grid.columns');
    if (saved) {
      const parsed = JSON.parse(saved) as ColumnId[];
      // Validate the columns
      const validColumns: ColumnId[] = ['allocated', 'net', 'remaining', 'lastActivity', 'entries'];
      const filteredColumns = parsed.filter(col => validColumns.includes(col));
      return filteredColumns.length > 0 ? filteredColumns : ['allocated', 'remaining', 'lastActivity'];
    }
  } catch (error) {
    console.error('Error loading visible columns from localStorage:', error);
  }
  return ['allocated', 'remaining', 'lastActivity']; // Default
};

const initialState: BudgetState = {
  budgets: [],
  currentBudgetId: null,
  categories: [],
  visibleColumnIds: loadVisibleColumns(),
  ledgerByCategoryId: {},
  templates: [],
  loading: false,
  error: undefined,
};

// Async Thunks
export const fetchCategoriesWithStats = createAsyncThunk(
  'budget/fetchCategoriesWithStats',
  async (budgetId: number) => {
    const categories = await invoke<any[]>('get_budget_categories_with_stats', { budgetId });
    return categories.map(c => ({
      categoryId: c.category_id,
      budgetId: c.budget_id,
      name: c.category_name,
      allocated: c.allocated_amount,
      net: c.net_amount,
      remaining: c.remaining_amount,
      lastActivityAt: c.last_activity_at,
      entriesCount: c.entries_count,
    })) as CategoryStats[];
  }
);

export const fetchLedger = createAsyncThunk(
  'budget/fetchLedger',
  async (params: { categoryId: number; limit?: number; offset?: number; sort?: string }) => {
    const { categoryId, limit = 50, offset = 0, sort = 'date_desc' } = params;
    const entries = await invoke<any[]>('get_category_ledger', { 
      categoryId, 
      limit, 
      offset, 
      sort 
    });
    return {
      categoryId,
      entries: entries.map(e => ({
        entryId: e.entry_id,
        categoryId: e.category_id,
        entryType: e.entry_type,
        what: e.what || e.description,
        where: e.where || e.place,
        amount: e.amount,
        date: e.date || e.expense_date,
        createdAt: e.created_at,
      })) as LedgerEntry[]
    };
  }
);

export const addEntry = createAsyncThunk(
  'budget/addEntry',
  async (payload: NewEntry) => {
    const entry = await invoke<any>('add_category_entry', { payload });
    return {
      entryId: entry.entry_id,
      categoryId: entry.category_id,
      entryType: entry.entry_type,
      what: entry.what || entry.description,
      where: entry.where || entry.place,
      amount: entry.amount,
      date: entry.date || entry.expense_date,
      createdAt: entry.created_at,
    } as LedgerEntry;
  }
);

export const updateEntry = createAsyncThunk(
  'budget/updateEntry',
  async (payload: UpdateEntry) => {
    await invoke('update_category_entry', { payload });
    return payload;
  }
);

export const deleteEntry = createAsyncThunk(
  'budget/deleteEntry',
  async (entryId: number) => {
    await invoke('soft_delete_category_entry', { entryId });
    return entryId;
  }
);

export const setAllocated = createAsyncThunk(
  'budget/setAllocated',
  async (params: { categoryId: number; amount: number }) => {
    await invoke('set_category_allocated_amount', { 
      categoryId: params.categoryId, 
      amount: params.amount 
    });
    return params;
  }
);

export const addCategory = createAsyncThunk(
  'budget/addCategory',
  async (payload: NewCategory) => {
    const categoryId = await invoke<number>('add_budget_category', { payload });
    return {
      categoryId,
      budgetId: payload.budgetId,
      name: payload.categoryName,
      allocated: payload.allocatedAmount,
      net: 0,
      remaining: payload.allocatedAmount,
      lastActivityAt: undefined,
      entriesCount: 0,
    } as CategoryStats;
  }
);

export const fetchTemplates = createAsyncThunk(
  'budget/fetchTemplates',
  async () => {
    const templates = await invoke<any[]>('list_templates');
    return templates.map(t => ({
      templateId: t.template_id,
      name: t.name,
      createdAt: t.created_at,
    })) as BudgetTemplate[];
  }
);

export const createTemplate = createAsyncThunk(
  'budget/createTemplate',
  async (name: string) => {
    const templateId = await invoke<number>('create_template', { name });
    return {
      templateId,
      name,
      createdAt: new Date().toISOString(),
    } as BudgetTemplate;
  }
);

export const applyTemplateToBudget = createAsyncThunk(
  'budget/applyTemplateToBudget',
  async (params: { templateId: number; budgetId: number }) => {
    await invoke('apply_template_to_budget', { 
      templateId: params.templateId, 
      budgetId: params.budgetId 
    });
    return params;
  }
);

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
    setVisibleColumns(state: BudgetState, action: PayloadAction<ColumnId[]>) {
      state.visibleColumnIds = action.payload;
      // Persist to localStorage
      try {
        localStorage.setItem('budget.grid.columns', JSON.stringify(action.payload));
      } catch (error) {
        console.error('Error saving visible columns to localStorage:', error);
      }
    },
    clearError(state: BudgetState) {
      state.error = undefined;
    }
  },
  extraReducers: (builder) => {
    // Categories with stats
    builder
      .addCase(fetchCategoriesWithStats.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchCategoriesWithStats.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategoriesWithStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });

    // Ledger
    builder
      .addCase(fetchLedger.fulfilled, (state, action) => {
        state.ledgerByCategoryId[action.payload.categoryId] = action.payload.entries;
      });

    // Add entry with optimistic update
    builder
      .addCase(addEntry.pending, (state, action) => {
        // Optimistic update: add temporary entry
        const categoryId = action.meta.arg.categoryId;
        if (!state.ledgerByCategoryId[categoryId]) {
          state.ledgerByCategoryId[categoryId] = [];
        }
        const tempEntry: LedgerEntry = {
          entryId: -Date.now(), // Temporary ID
          categoryId: action.meta.arg.categoryId,
          entryType: action.meta.arg.entryType,
          what: action.meta.arg.what,
          where: action.meta.arg.where,
          amount: action.meta.arg.amount,
          date: action.meta.arg.date,
          createdAt: new Date().toISOString(),
        };
        state.ledgerByCategoryId[categoryId].unshift(tempEntry);
        
        // Update category stats optimistically
        const category = state.categories.find(c => c.categoryId === categoryId);
        if (category) {
          const netChange = action.meta.arg.entryType === 'income' ? action.meta.arg.amount : -action.meta.arg.amount;
          category.net += netChange;
          category.remaining += netChange;
          category.entriesCount += 1;
        }
      })
      .addCase(addEntry.fulfilled, (state, action) => {
        // Replace temporary entry with real entry
        const categoryId = action.payload.categoryId;
        const ledger = state.ledgerByCategoryId[categoryId] || [];
        const tempIndex = ledger.findIndex(entry => entry.entryId < 0);
        if (tempIndex >= 0) {
          ledger[tempIndex] = action.payload;
        }
      })
      .addCase(addEntry.rejected, (state, action) => {
        // Rollback optimistic update
        const categoryId = action.meta.arg.categoryId;
        const ledger = state.ledgerByCategoryId[categoryId] || [];
        const tempIndex = ledger.findIndex(entry => entry.entryId < 0);
        if (tempIndex >= 0) {
          ledger.splice(tempIndex, 1);
          
          // Rollback category stats
          const category = state.categories.find(c => c.categoryId === categoryId);
          if (category) {
            const netChange = action.meta.arg.entryType === 'income' ? action.meta.arg.amount : -action.meta.arg.amount;
            category.net -= netChange;
            category.remaining -= netChange;
            category.entriesCount -= 1;
          }
        }
        state.error = action.error.message;
      });

    // Update entry
    builder
      .addCase(updateEntry.fulfilled, (state, action) => {
        const { entryId } = action.payload;
        // Find the entry in any ledger
        Object.keys(state.ledgerByCategoryId).forEach(categoryIdStr => {
          const categoryId = parseInt(categoryIdStr);
          const ledger = state.ledgerByCategoryId[categoryId] || [];
          const entryIndex = ledger.findIndex(entry => entry.entryId === entryId);
          if (entryIndex >= 0) {
            ledger[entryIndex] = { 
              ...ledger[entryIndex], 
              entryType: action.payload.entryType,
              what: action.payload.what,
              where: action.payload.where,
              amount: action.payload.amount,
              date: action.payload.date,
            };
          }
        });
      });

    // Delete entry
    builder
      .addCase(deleteEntry.fulfilled, (state, action) => {
        const entryId = action.payload;
        // Remove from all ledgers
        Object.keys(state.ledgerByCategoryId).forEach(categoryIdStr => {
          const categoryId = parseInt(categoryIdStr);
          const ledger = state.ledgerByCategoryId[categoryId];
          const entryIndex = ledger.findIndex(entry => entry.entryId === entryId);
          if (entryIndex >= 0) {
            ledger.splice(entryIndex, 1);
            
            // Update category stats
            const category = state.categories.find(c => c.categoryId === categoryId);
            if (category) {
              category.entriesCount -= 1;
            }
          }
        });
      });

    // Set allocated amount
    builder
      .addCase(setAllocated.fulfilled, (state, action) => {
        const { categoryId, amount } = action.payload;
        const category = state.categories.find(c => c.categoryId === categoryId);
        if (category) {
          const diff = amount - category.allocated;
          category.allocated = amount;
          category.remaining += diff;
        }
      });

    // Add category
    builder
      .addCase(addCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      });

    // Templates
    builder
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.templates.unshift(action.payload);
      });
  },
});

export const { 
  setBudgets, 
  setCurrentBudget, 
  addBudget, 
  finishBudget, 
  unfinishBudget, 
  updateBudgetTitle, 
  setVisibleColumns,
  clearError 
} = budgetSlice.actions;

export default budgetSlice.reducer;



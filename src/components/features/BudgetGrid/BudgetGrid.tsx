import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/types";
import { setBudgets } from "../../../store/slices/budgetSlice";
import { createMonthlyBudget, listMonthlyBudgetsSorted, initDatabase, deleteMonthlyBudget, SortCriteria } from "../../../services/budgetService";
import { MonthlyBudget } from "../../../store/slices/budgetSlice";
import BudgetList from "./BudgetList";
import BudgetDetail from "./BudgetDetail";
import CreateBudgetForm from "./CreateBudgetForm";
import BackButton from "../../common/BackButton";

type ViewMode = 'list' | 'detail' | 'create';

function BudgetGrid() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const budgets = useAppSelector((s) => (s as any).budget.budgets);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedBudget, setSelectedBudget] = useState<MonthlyBudget | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSort, setCurrentSort] = useState<SortCriteria | null>(null); // null = default budget_date sort

  // Check if we should open the create form or show a specific budget based on navigation state
  useEffect(() => {
    const state = location.state as { openCreateForm?: boolean; selectedBudgetId?: number; fromPage?: string } | null;
    if (state?.openCreateForm) {
      setViewMode('create');
      // Preserve fromPage but clear openCreateForm to prevent reopening on refresh
      window.history.replaceState({ fromPage: state.fromPage }, document.title);
    } else if (state?.selectedBudgetId && budgets.length > 0) {
      const budget = budgets.find((b: MonthlyBudget) => b.budgetId === state.selectedBudgetId);
      if (budget) {
        setSelectedBudget(budget);
        setViewMode('detail');
        // Preserve fromPage but clear selectedBudgetId to prevent reopening on refresh
        window.history.replaceState({ fromPage: state.fromPage }, document.title);
      }
    }
  }, [location.state, budgets]);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        console.log("Starting budget loading process...");
        await initDatabase();
        console.log("Database initialized successfully");
        
        // Use default budget_date sorting when currentSort is null
        const sortToUse = currentSort || { criteria: 'budget_date', ascending: false };
        console.log("Loading budgets with sort:", sortToUse);
        const list = await listMonthlyBudgetsSorted(sortToUse);
        console.log("Loaded budgets:", list);
        dispatch(setBudgets(list));
      } catch (err) {
        console.error("Error loading budgets:", err);
        setError(`Failed to load budgets: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [dispatch, currentSort]);

  const handleBudgetClick = (budget: MonthlyBudget) => {
    setSelectedBudget(budget);
    setViewMode('detail');
  };

  const handleCreateBudget = async (month: number, year: number, income: number, name?: string) => {
    console.log("handleCreateBudget called with:", { month, year, income, name });
    console.log("Current budgets:", budgets);
    
    try {
      setError(null);
      
      // Check if a budget for this month/year already exists
      const existingBudget = budgets.find((b: MonthlyBudget) => {
        console.log(`Comparing budget ${b.month}/${b.year} with ${month}/${year}`);
        return b.month === month && b.year === year;
      });
      
      if (existingBudget) {
        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
        const errorMsg = `A budget for ${monthName} ${year} already exists. Please choose a different month/year or edit the existing budget.`;
        console.log("Duplicate budget detected:", errorMsg);
        setError(errorMsg);
        return;
      }
      
      console.log("No duplicate found, proceeding with creation...");
      console.log("Creating budget with:", { 
        month, 
        year, 
        income,
        name 
      });
      
      const id = await createMonthlyBudget(month, year, income, name);
      console.log("Budget created with ID:", id);
      
      // Reload budgets to get the new one with all fields
      const sortToUse = currentSort || { criteria: 'budget_date', ascending: false };
      const list = await listMonthlyBudgetsSorted(sortToUse);
      dispatch(setBudgets(list));
      
      // Find the new budget and select it
      const newBudget = list.find(b => b.budgetId === id);
      if (newBudget) {
        setSelectedBudget(newBudget);
        setViewMode('detail');
      }
    } catch (err) {
      console.error("Error creating budget:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create budget";
      setError(errorMessage);
      // Don't throw here - just set the error
    }
  };

  const handleSortChange = async (sort: SortCriteria | null) => {
    try {
      setCurrentSort(sort);
      setIsLoading(true);
      // Use default budget_date sorting when sort is null
      const sortToUse = sort || { criteria: 'budget_date', ascending: false };
      const list = await listMonthlyBudgetsSorted(sortToUse);
      dispatch(setBudgets(list));
    } catch (err) {
      console.error("Error sorting budgets:", err);
      setError("Failed to sort budgets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedBudget(null);
    setError(null);
  };

  const handleShowCreateForm = () => {
    setViewMode('create');
    setError(null);
  };

  const handleDeleteBudget = async (budgetId: number) => {
    console.log("handleDeleteBudget called with ID:", budgetId);
    
    try {
      setError(null);
      console.log("Deleting budget with ID:", budgetId);
      
      await deleteMonthlyBudget(budgetId);
      console.log("Budget deleted successfully");
      
      // If we deleted the currently selected budget, go back to list
      if (selectedBudget && selectedBudget.budgetId === budgetId) {
        setSelectedBudget(null);
        setViewMode('list');
      }
      
      // Reload budgets to update the list
      const sortToUse = currentSort || { criteria: 'budget_date', ascending: false };
      const list = await listMonthlyBudgetsSorted(sortToUse);
      dispatch(setBudgets(list));
    } catch (err) {
      console.error("Error deleting budget:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete budget";
      setError(errorMessage);
    }
  };

  if (viewMode === 'detail' && selectedBudget) {
    return (
      <div>
        <BackButton />
        <BudgetDetail 
          budget={selectedBudget} 
          onBack={handleBackToList} 
          onDelete={handleDeleteBudget}
        />
      </div>
    );
  }

  if (viewMode === 'create') {
    return (
      <div>
        <BackButton />
        <CreateBudgetForm
          onSubmit={handleCreateBudget}
          onCancel={handleBackToList}
          isLoading={isLoading}
          error={error}
        />
      </div>
    );
  }

  return (
    <div>
      <BackButton />
      <BudgetList
        budgets={budgets}
        onBudgetClick={handleBudgetClick}
        onCreateBudget={handleShowCreateForm}
        onDeleteBudget={handleDeleteBudget}
        onSortChange={handleSortChange}
        currentSort={currentSort}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}

export default BudgetGrid;



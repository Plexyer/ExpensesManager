import { Calendar, DollarSign, Plus, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2 } from 'lucide-react';
import { MonthlyBudget } from '../../../store/slices/budgetSlice';
import { SortCriteria } from '../../../services/budgetService';

interface BudgetListProps {
  budgets: MonthlyBudget[];
  onBudgetClick: (budget: MonthlyBudget) => void;
  onCreateBudget: () => void;
  onDeleteBudget: (budgetId: number) => Promise<void>;
  onSortChange: (sort: SortCriteria | null) => void; // null for clear/default
  currentSort: SortCriteria | null; // null when using default (no highlight)
  isLoading: boolean;
  error: string | null;
}

function BudgetList({ budgets, onBudgetClick, onCreateBudget, onDeleteBudget, onSortChange, currentSort, isLoading, error }: BudgetListProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const sortOptions = [
    { value: 'budget_date', label: 'Budget Date' },
    { value: 'created_date', label: 'Created Date' },
    { value: 'finished_date', label: 'Finished Date' },
    { value: 'name', label: 'Alphabetically' },
    { value: 'income', label: 'Income Amount' }
  ] as const;

  const handleSortChange = (criteria: SortCriteria['criteria']) => {
    if (currentSort && currentSort.criteria === criteria) {
      // Toggle direction if same criteria
      onSortChange({ criteria, ascending: !currentSort.ascending });
    } else {
      // New criteria, default to descending for dates and income, ascending for name
      const ascending = criteria === 'name';
      onSortChange({ criteria, ascending });
    }
  };

  const handleClearSort = () => {
    onSortChange(null); // This will use default budget_date sorting without highlighting
  };

  const getSortIcon = (criteria: SortCriteria['criteria']) => {
    if (!currentSort || currentSort.criteria !== criteria) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return currentSort.ascending ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-3xl font-bold text-slate-900">Monthly Budgets</h2>
          <button
            onClick={onCreateBudget}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Budget
          </button>
        </div>
        
        {/* Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Sort by:</span>
          <button
            onClick={handleClearSort}
            className="flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Clear Sort
            <X className="w-4 h-4 ml-1" />
          </button>
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              disabled={isLoading}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                currentSort && currentSort.criteria === option.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {option.label}
              <span className="ml-1">
                {getSortIcon(option.value)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No budgets found</h3>
            <p className="text-slate-600 mb-6">
              Get started by creating your first budget.
            </p>
            <button
              onClick={onCreateBudget}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm flex items-center justify-center mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Budget
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">        {budgets.map((budget) => (
          <div
            key={budget.budgetId}
            className="bg-white rounded-lg shadow-financial border border-slate-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-200 group relative"
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="flex items-center cursor-pointer flex-1"
                onClick={() => onBudgetClick(budget)}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors duration-200">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-200">
                    {budget.name || `${monthNames[budget.month - 1]} ${budget.year}`}
                  </h3>
                  <p className="text-sm text-slate-600">Budget #{budget.budgetId}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBudget(budget.budgetId);
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
                title="Delete Budget"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div 
              className="space-y-3 cursor-pointer"
              onClick={() => onBudgetClick(budget)}
            >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-slate-700">Total Income</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(budget.totalIncome)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Created:</span>
                    <span>{formatDate(budget.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>For:</span>
                    <span>{monthNames[budget.month - 1]} {budget.year}</span>
                  </div>
                  {budget.finishedAt && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Finished:</span>
                      <span>{formatDate(budget.finishedAt)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Click to view details</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BudgetList;

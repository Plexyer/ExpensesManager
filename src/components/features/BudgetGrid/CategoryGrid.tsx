import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Edit3 } from 'lucide-react';
import { RootState } from '../../../store/store';
import { 
  fetchCategoriesWithStats, 
  setAllocated, 
  addCategory, 
  setVisibleColumns 
} from '../../../store/slices/budgetSlice';
import { CategoryStats, NewCategory } from '../../../types/budget';
import { ALL_COLUMNS } from './categoryColumns';
import ChooseColumnsPopover from './ChooseColumnsPopover';
import CategoryLedgerModal from './CategoryLedgerModal';

interface CategoryGridProps {
  budgetId: number;
}

function CategoryGrid({ budgetId }: CategoryGridProps) {
  const dispatch = useDispatch();
  const { categories, visibleColumnIds, loading, error } = useSelector((state: RootState) => state.budget);
  
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [ledgerModalCategoryId, setLedgerModalCategoryId] = useState<number | null>(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAllocated, setNewCategoryAllocated] = useState('');

  const editInputRef = useRef<HTMLInputElement>(null);

  // Load categories when budgetId changes
  useEffect(() => {
    if (budgetId) {
      dispatch(fetchCategoriesWithStats(budgetId) as any);
    }
  }, [budgetId, dispatch]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingCategoryId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCategoryId]);

  const visibleColumns = ALL_COLUMNS.filter(col => visibleColumnIds.includes(col.id));

  const handleStartEdit = (category: CategoryStats) => {
    setEditingCategoryId(category.categoryId);
    setEditValue(category.allocated.toString());
  };

  const handleSaveEdit = async () => {
    if (editingCategoryId && editValue) {
      const amount = parseFloat(editValue);
      if (!isNaN(amount) && amount >= 0) {
        await dispatch(setAllocated({ categoryId: editingCategoryId, amount }) as any);
        dispatch(fetchCategoriesWithStats(budgetId) as any); // Refresh stats
      }
    }
    setEditingCategoryId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleNetClick = (category: CategoryStats) => {
    setLedgerModalCategoryId(category.categoryId);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() && newCategoryAllocated) {
      const allocated = parseFloat(newCategoryAllocated);
      if (!isNaN(allocated) && allocated >= 0) {
        const payload: NewCategory = {
          budgetId,
          categoryName: newCategoryName.trim(),
          allocatedAmount: allocated,
        };
        await dispatch(addCategory(payload) as any);
        setNewCategoryName('');
        setNewCategoryAllocated('');
        setShowNewCategoryForm(false);
      }
    }
  };

  const handleColumnsChange = (columns: any[]) => {
    dispatch(setVisibleColumns(columns));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-8">
        <div className="text-center text-red-600">
          <p>Error loading categories: {error}</p>
          <button 
            onClick={() => dispatch(fetchCategoriesWithStats(budgetId) as any)}
            className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-slate-900">Budget Categories</h2>
        <div className="flex items-center gap-3">
          <ChooseColumnsPopover 
            visibleColumns={visibleColumnIds}
            onColumnsChange={handleColumnsChange}
          />
          <button
            onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* New Category Form */}
      {showNewCategoryForm && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Category name (e.g., Groceries)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <input
              type="number"
              placeholder="Allocated amount"
              value={newCategoryAllocated}
              onChange={(e) => setNewCategoryAllocated(e.target.value)}
              step="0.01"
              min="0"
              className="w-32 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowNewCategoryForm(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Grid */}
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 overflow-hidden">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No categories yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first budget category to start tracking expenses.
            </p>
            <button
              onClick={() => setShowNewCategoryForm(true)}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm flex items-center mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-700 min-w-0">
                    Category
                  </th>
                  {visibleColumns.map(column => (
                    <th 
                      key={column.id}
                      className={`p-4 font-medium text-slate-700 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="p-4 font-medium text-slate-700 text-center w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.categoryId} className="hover:bg-slate-25 transition-colors duration-150">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{category.name}</div>
                    </td>
                    {visibleColumns.map(column => (
                      <td 
                        key={column.id}
                        className={`p-4 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {column.id === 'allocated' && editingCategoryId === category.categoryId ? (
                          <input
                            ref={editInputRef}
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={handleKeyDown}
                            step="0.01"
                            min="0"
                            className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                          />
                        ) : column.id === 'allocated' ? (
                          <button
                            onClick={() => handleStartEdit(category)}
                            className="text-left hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            title="Click to edit allocated amount"
                          >
                            {column.render(category)}
                            <Edit3 className="w-3 h-3 ml-1 inline opacity-0 group-hover:opacity-100" />
                          </button>
                        ) : (column.id === 'net' || column.id === 'remaining') ? (
                          <button
                            onClick={() => handleNetClick(category)}
                            className="hover:bg-slate-50 px-2 py-1 rounded transition-colors cursor-pointer"
                            title="Double-click to view ledger"
                          >
                            {column.render(category)}
                          </button>
                        ) : (
                          column.render(category)
                        )}
                      </td>
                    ))}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setLedgerModalCategoryId(category.categoryId)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        title="Add entry"
                      >
                        + Entry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ledger Modal */}
      {ledgerModalCategoryId && (
        <CategoryLedgerModal
          categoryId={ledgerModalCategoryId}
          category={categories.find(c => c.categoryId === ledgerModalCategoryId)}
          onClose={() => setLedgerModalCategoryId(null)}
          onEntryAdded={() => {
            dispatch(fetchCategoriesWithStats(budgetId) as any);
          }}
        />
      )}
    </div>
  );
}

export default CategoryGrid;

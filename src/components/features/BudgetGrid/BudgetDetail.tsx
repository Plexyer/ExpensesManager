import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, Calendar, TrendingUp, Trash2, Check, Edit, Save, X } from 'lucide-react';
import { MonthlyBudget } from '../../../store/slices/budgetSlice';
import { getBudgetChangeHistory, BudgetChangeHistoryEntry } from '../../../services/budgetService';
import { useTimezone } from '../../../contexts/TimezoneContext';
import BudgetChangeHistory from './BudgetChangeHistory';
import CategoryGrid from './CategoryGrid';
import TemplateSelector from '../../TemplateSelector';
import MigrationRunner from '../../MigrationRunner';
import { invoke } from '@tauri-apps/api/core';

interface BudgetDetailProps {
  budget: MonthlyBudget;
  onBack: () => void;
  onDelete: (budgetId: number) => Promise<void>;
  onFinish: (budgetId: number) => Promise<void>;
  onUnfinish: (budgetId: number) => Promise<void>;
  onUpdateTitle: (budgetId: number, newTitle: string) => Promise<void>;
}

function BudgetDetail({ budget, onBack, onDelete, onFinish, onUnfinish, onUpdateTitle }: BudgetDetailProps) {
  const [expenses] = useState(0); // TODO: Load actual expenses
  const [isFinishing, setIsFinishing] = useState(false);
  const [isUnfinishing, setIsUnfinishing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(budget.name || '');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [lastFinishedDate, setLastFinishedDate] = useState<string | null>(null);
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null); // null = loading, false = no template, true = has template
  const [needsMigration, setNeedsMigration] = useState(false);
  const [categoryGridKey, setCategoryGridKey] = useState(0); // Force CategoryGrid refresh
  const { formatDateInTimezone } = useTimezone();

  // Load the last finished date from change history
  useEffect(() => {
    async function loadLastFinishedDate() {
      try {
        const historyData = await getBudgetChangeHistory(budget.budgetId);
        // Find the most recent "finish" action in the change history
        const finishActions = historyData.filter((entry: BudgetChangeHistoryEntry) => 
          entry.changeType === 'status_change' && 
          (entry.changeDescription.includes('finished') || entry.changeDescription.includes('marked as finished'))
        );
        
        if (finishActions.length > 0) {
          // Sort by date descending and get the most recent
          finishActions.sort((a: BudgetChangeHistoryEntry, b: BudgetChangeHistoryEntry) => 
            new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
          );
          setLastFinishedDate(finishActions[0].changedAt);
        } else {
          setLastFinishedDate(null);
        }
      } catch (error) {
        console.error('Failed to load last finished date:', error);
        setLastFinishedDate(null);
      }
    }

    loadLastFinishedDate();
  }, [budget.budgetId, historyRefreshKey]); // Refresh when history changes

  // Check if budget has a template applied
  useEffect(() => {
    async function checkTemplate() {
      try {
        // Check if budget has categories (indicates template applied)
        const categories = await invoke<any[]>('get_budget_categories_with_stats', { budgetId: budget.budgetId });
        setHasTemplate(categories.length > 0);
        setNeedsMigration(false);
      } catch (error) {
        const errorStr = String(error);
        console.error('Failed to check template:', error);
        // If error mentions missing tables, we need migration
        if (errorStr.includes('no such table') || errorStr.includes('budget_templates') || errorStr.includes('global_categories')) {
          setNeedsMigration(true);
          setHasTemplate(false);
        } else {
          setHasTemplate(false);
          setNeedsMigration(false);
        }
      }
    }

    checkTemplate();
  }, [budget.budgetId, categoryGridKey]);

  const handleTemplateApplied = () => {
    setHasTemplate(true);
    setCategoryGridKey(prev => prev + 1); // Force CategoryGrid refresh
    setHistoryRefreshKey(prev => prev + 1); // Refresh change history
  };

  const handleMigrationComplete = () => {
    setNeedsMigration(false);
    setCategoryGridKey(prev => prev + 1); // Force template check
  };

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

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await onFinish(budget.budgetId);
      setHistoryRefreshKey(prev => prev + 1); // Refresh history
    } catch (error) {
      console.error('Failed to finish budget:', error);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleUnfinish = async () => {
    setIsUnfinishing(true);
    try {
      await onUnfinish(budget.budgetId);
      setHistoryRefreshKey(prev => prev + 1); // Refresh history
    } catch (error) {
      console.error('Failed to unfinish budget:', error);
    } finally {
      setIsUnfinishing(false);
    }
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() === (budget.name || '')) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    try {
      await onUpdateTitle(budget.budgetId, editedTitle.trim());
      setHistoryRefreshKey(prev => prev + 1); // Refresh history
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Failed to update title:', error);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(budget.name || '');
    setIsEditingTitle(false);
  };

  const remaining = budget.totalIncome - expenses;
  const spentPercentage = budget.totalIncome > 0 ? (expenses / budget.totalIncome) * 100 : 0;
  const isFinished = !!budget.finishedAt;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Budget List
        </button>
        
        <div className="flex items-center space-x-3">
          {isFinished ? (
            <button
              onClick={handleUnfinish}
              disabled={isUnfinishing}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              {isUnfinishing ? 'Editing...' : 'Edit Budget'}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isFinishing}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors duration-200"
            >
              <Check className="w-4 h-4 mr-2" />
              {isFinishing ? 'Finishing...' : 'Finish Budget'}
            </button>
          )}
          
          <button
            onClick={() => onDelete(budget.budgetId)}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Budget
          </button>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-3xl font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    placeholder={`${monthNames[budget.month - 1]} ${budget.year}`}
                  />
                  <button
                    onClick={handleSaveTitle}
                    disabled={isSavingTitle}
                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors duration-200"
                    title="Save"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors duration-200"
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  <h1 className="text-3xl font-bold text-slate-900">
                    {budget.name || `${monthNames[budget.month - 1]} ${budget.year}`}
                  </h1>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors duration-200"
                    title="Edit Title"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isFinished 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              }`}>
                {isFinished ? '✓ Finished' : '⏳ In Progress'}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-slate-600">Budget ID: {budget.budgetId}</p>
              <p className="text-slate-500 text-sm">
                Created: {new Date(budget.createdAt).toLocaleDateString()}
              </p>
              <p className="text-slate-500 text-sm">
                Budget Date: {monthNames[budget.month - 1]} {budget.year}
              </p>
              <p className="text-slate-500 text-sm">
                Last Finished: {lastFinishedDate ? formatDateInTimezone(lastFinishedDate).date : 'never finished'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Budget Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800">Total Income</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(budget.totalIncome)}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800">Total Expenses</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(expenses)}</p>
              </div>
            </div>
          </div>

          <div className={`${remaining >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                remaining >= 0 ? 'bg-blue-600' : 'bg-red-600'
              }`}>
                <span className="text-white font-bold text-sm">$</span>
              </div>
              <div>
                <p className={`text-sm font-medium ${remaining >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  {remaining >= 0 ? 'Remaining' : 'Over Budget'}
                </p>
                <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                  {formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Budget Usage</span>
            <span className="text-sm text-slate-600">{spentPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                spentPercentage <= 75 ? 'bg-green-500' : 
                spentPercentage <= 90 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Budget Categories Grid */}
      {needsMigration ? (
        // Database migration needed
        <MigrationRunner onMigrationComplete={handleMigrationComplete} />
      ) : hasTemplate === null ? (
        // Loading state
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      ) : hasTemplate ? (
        // Template is applied, show CategoryGrid
        <CategoryGrid budgetId={budget.budgetId} key={categoryGridKey} />
      ) : (
        // No template applied, show template selector
        <TemplateSelector 
          budgetId={budget.budgetId} 
          onTemplateApplied={handleTemplateApplied}
        />
      )}

      {/* Change History */}
      <BudgetChangeHistory budgetId={budget.budgetId} refreshKey={historyRefreshKey} />
    </div>
  );
}

export default BudgetDetail;

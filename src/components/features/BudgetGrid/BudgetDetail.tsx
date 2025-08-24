import { useState } from 'react';
import { ArrowLeft, DollarSign, Calendar, TrendingUp, Trash2 } from 'lucide-react';
import { MonthlyBudget } from '../../../store/slices/budgetSlice';

interface BudgetDetailProps {
  budget: MonthlyBudget;
  onBack: () => void;
  onDelete: (budgetId: number) => Promise<void>;
}

function BudgetDetail({ budget, onBack, onDelete }: BudgetDetailProps) {
  const [expenses] = useState(0); // TODO: Load actual expenses
  const [categories] = useState([]); // TODO: Load actual categories

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

  const remaining = budget.totalIncome - expenses;
  const spentPercentage = budget.totalIncome > 0 ? (expenses / budget.totalIncome) * 100 : 0;

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
        
        <button
          onClick={() => onDelete(budget.budgetId)}
          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Budget
        </button>
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {monthNames[budget.month - 1]} {budget.year} Budget
            </h1>
            <p className="text-slate-600 mt-1">Budget ID: {budget.budgetId}</p>
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

      {/* Categories Section */}
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Budget Categories</h2>
        {categories.length > 0 ? (
          <div className="space-y-4">
            {/* TODO: Map through categories when available */}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 mb-4">No categories set up yet</p>
            <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
              Add Categories
            </button>
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Expenses</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 mb-4">No expenses recorded yet</p>
          <button className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
            Add Expense
          </button>
        </div>
      </div>
    </div>
  );
}

export default BudgetDetail;

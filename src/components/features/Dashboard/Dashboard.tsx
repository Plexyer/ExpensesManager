import { useEffect } from "react";
import { DollarSign, TrendingDown, TrendingUp, PiggyBank } from 'lucide-react';
import { useAppDispatch, useAppSelector } from "../../../store/types";
import { setBudgets } from "../../../store/slices/budgetSlice";
import { listMonthlyBudgetsSorted, initDatabase } from "../../../services/budgetService";
import { MonthlyBudget } from "../../../store/slices/budgetSlice";
import { useNavigate } from "react-router-dom";
import BackButton from "../../common/BackButton";

function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const budgets = useAppSelector((s) => (s as any).budget.budgets as MonthlyBudget[]);

  useEffect(() => {
    async function load() {
      try {
        await initDatabase();
        // Load budgets sorted by last edited date descending (most recently edited first)
        const budgetList = await listMonthlyBudgetsSorted({ criteria: 'last_edited', ascending: false });
        dispatch(setBudgets(budgetList));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    }
    load();
  }, [dispatch]);

  // Calculate current month budget data
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();
  
  const currentMonthBudget = budgets.find(b => b.month === currentMonth && b.year === currentYear);
  
  // Calculate statistics
  const totalBudgets = budgets.length;
  const totalIncome = budgets.reduce((sum, b) => sum + b.totalIncome, 0);
  const currentMonthIncome = currentMonthBudget?.totalIncome || 0;
  
  // Placeholder for expenses (would come from expense data)
  const currentMonthSpent = 0; // TODO: Calculate from actual expenses
  const currentMonthRemaining = currentMonthIncome - currentMonthSpent;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    return new Date(currentYear, month - 1).toLocaleDateString('en-US', { month: 'long' });
  };

  const handleCreateBudget = () => {
    navigate('/budget', { state: { openCreateForm: true, fromPage: 'dashboard' } });
  };

  const handleViewBudgets = () => {
    navigate('/budget', { state: { fromPage: 'dashboard' } });
  };

  const handleViewBudget = (budgetId: number) => {
    navigate('/budget', { state: { selectedBudgetId: budgetId, fromPage: 'dashboard' } });
  };

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">This Month Income</p>
              <p className="text-3xl font-bold text-slate-900">
                {currentMonthIncome > 0 ? formatCurrency(currentMonthIncome) : '$—'}
              </p>
              {currentMonthBudget && (
                <p className="text-xs text-slate-400 mt-1">
                  {getMonthName(currentMonth)} {currentYear}
                </p>
              )}
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Spent</p>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(currentMonthSpent)}</p>
              <p className="text-xs text-slate-400 mt-1">This month</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Remaining</p>
              <p className={`text-3xl font-bold ${currentMonthRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentMonthIncome > 0 ? formatCurrency(currentMonthRemaining) : '$—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">This month</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <PiggyBank className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Budgets</p>
              <p className="text-3xl font-bold text-emerald-600">{totalBudgets}</p>
              <p className="text-xs text-slate-400 mt-1">
                {totalIncome > 0 ? `${formatCurrency(totalIncome)} total income` : 'All time'}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Overview Section */}
      {budgets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Welcome to Budget Manager!</h3>
          <p className="text-slate-600 mb-4">
            Get started by creating your first budget. Track your income, manage expenses, and take control of your finances.
          </p>
          <button 
            onClick={handleCreateBudget}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm"
          >
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Budgets</h3>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleCreateBudget}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm"
              >
                Create New Budget
              </button>
              <button 
                onClick={handleViewBudgets}
                className="text-blue-700 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
              >
                View All Budgets →
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {budgets.slice(0, 3).map((budget) => (
              <div 
                key={budget.budgetId}
                className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-200"
                onClick={() => handleViewBudget(budget.budgetId)}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {budget.name || `${getMonthName(budget.month)} ${budget.year}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatCurrency(budget.totalIncome)} income
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {getMonthName(budget.month)} {budget.year}
                  </p>
                  <p className="text-xs text-slate-400">
                    Budget #{budget.budgetId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;



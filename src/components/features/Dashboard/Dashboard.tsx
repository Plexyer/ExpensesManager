import { useEffect } from "react";
import { DollarSign, TrendingDown, TrendingUp, PiggyBank } from 'lucide-react';
import { useAppDispatch } from "../../../store/types";
import { setBudgets } from "../../../store/slices/budgetSlice";
import { listMonthlyBudgets, initDatabase } from "../../../services/budgetService";

function Dashboard() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    async function load() {
      await initDatabase();
      const budgets = await listMonthlyBudgets();
      dispatch(setBudgets(budgets));
    }
    load();
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm">New Budget</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">This Month Income</p>
              <p className="text-3xl font-bold text-slate-900">$—</p>
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
              <p className="text-3xl font-bold text-red-600">$—</p>
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
              <p className="text-3xl font-bold text-green-600">$—</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <PiggyBank className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Savings</p>
              <p className="text-3xl font-bold text-emerald-600">$—</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Budget Overview</h3>
        <p className="text-slate-600">Welcome back. Select a budget to start managing your expenses.</p>
        <button className="mt-4 bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200">Create Your First Budget</button>
      </div>
    </div>
  );
}

export default Dashboard;



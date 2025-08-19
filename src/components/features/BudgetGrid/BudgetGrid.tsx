import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/types";
import { addBudget, setBudgets } from "../../../store/slices/budgetSlice";
import { createMonthlyBudget, listMonthlyBudgets } from "../../../services/budgetService";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

function BudgetGrid() {
  const dispatch = useAppDispatch();
  const budgets = useAppSelector((s) => (s as any).budget.budgets);
  const [incomeInput, setIncomeInput] = useState(0);

  useEffect(() => {
    async function load() {
      const list = await listMonthlyBudgets();
      dispatch(setBudgets(list));
    }
    load();
  }, [dispatch]);

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: "Month", field: "month", width: 100 },
      { headerName: "Year", field: "year", width: 100 },
      { headerName: "Total Income", field: "totalIncome", width: 140 },
    ],
    [],
  );

  async function onCreateBudget() {
    const now = new Date();
    const id = await createMonthlyBudget(now.getMonth() + 1, now.getFullYear(), incomeInput);
    dispatch(addBudget({ budgetId: id, month: now.getMonth() + 1, year: now.getFullYear(), totalIncome: incomeInput }));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Monthly Budgets</h2>
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-4 space-y-4">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-48"
            placeholder="Total income"
            value={incomeInput}
            onChange={(e) => setIncomeInput(Number(e.target.value))}
          />
          <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm active:scale-95" onClick={onCreateBudget}>
            Create Current Month Budget
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-financial">
          <div className="ag-theme-quartz">
            <AgGridReact rowData={budgets} columnDefs={cols} domLayout="autoHeight" rowClass="odd:bg-white even:bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BudgetGrid;



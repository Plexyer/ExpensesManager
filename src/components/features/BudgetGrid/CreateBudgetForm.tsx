import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';

interface CreateBudgetFormProps {
  onSubmit: (month: number, year: number, income: number, name?: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
  isModal?: boolean;
}

function CreateBudgetForm({ onSubmit, onCancel, isLoading, error, isModal = false }: CreateBudgetFormProps) {
  const currentDate = new Date();
  const [incomeInput, setIncomeInput] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const getMonthName = (month: number) => {
    return new Date(selectedYear, month - 1).toLocaleDateString('en-US', { month: 'long' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submission started with values:", {
      selectedMonth,
      selectedYear,
      incomeInput,
      nameInput
    });
    
    if (incomeInput <= 0) {
      console.log("Validation failed: income <= 0");
      return;
    }
    
    try {
      console.log("Calling onSubmit with:", selectedMonth, selectedYear, incomeInput, nameInput.trim() || undefined);
      await onSubmit(selectedMonth, selectedYear, incomeInput, nameInput.trim() || undefined);
      console.log("onSubmit completed successfully");
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      // Re-throw the error so it can be handled by the parent component
      throw error;
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Create New Budget</h2>
        {isModal && (
          <button
            onClick={onCancel}
            className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 mt-1">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-1">Creating Budget</h3>
            <p className="text-sm text-blue-700">
              Create a budget for {getMonthName(selectedMonth)} {selectedYear}.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-slate-700 mb-2">
              Month
            </label>
            <select
              id="month"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(selectedYear, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-2">
              Year
            </label>
            <input
              id="year"
              type="number"
              min="1900"
              max="2100"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              placeholder="Enter year (e.g., 2025)"
            />
          </div>
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
            Budget Name (Optional)
          </label>
          <input
            id="name"
            type="text"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            placeholder={`${getMonthName(selectedMonth)} ${selectedYear} Budget`}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={100}
          />
          <p className="mt-1 text-sm text-slate-500">Leave empty to use default name</p>
        </div>

        <div>
          <label htmlFor="income" className="block text-sm font-medium text-slate-700 mb-2">
            Total Monthly Income
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="income"
              type="number"
              min="0"
              step="0.01"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              placeholder="Enter your total income"
              value={incomeInput || ""}
              onChange={(e) => setIncomeInput(Number(e.target.value))}
              required
            />
          </div>
          {incomeInput <= 0 && (
            <p className="mt-1 text-sm text-red-600">Please enter a valid income amount</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || incomeInput <= 0}
            className="px-6 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm"
          >
            {isLoading ? 'Creating...' : 'Create Budget'}
          </button>
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
      {content}
    </div>
  );
}

export default CreateBudgetForm;

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { BudgetChangeHistoryEntry, getBudgetChangeHistory } from '../../../services/budgetService';
import { useTimezone } from '../../../contexts/TimezoneContext';

interface BudgetChangeHistoryProps {
  budgetId: number;
  refreshKey?: number; // Add this to force refresh when actions happen
}

function BudgetChangeHistory({ budgetId, refreshKey }: BudgetChangeHistoryProps) {
  const [history, setHistory] = useState<BudgetChangeHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { formatDateInTimezone } = useTimezone();

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true);
        setError(null);
        console.log("🔍 Loading change history for budget:", budgetId, "refreshKey:", refreshKey);
        const historyData = await getBudgetChangeHistory(budgetId);
        console.log("📊 Received history data:", historyData);
        console.log("📊 First entry details:", historyData[0]);
        setHistory(historyData);
      } catch (err) {
        console.error('Failed to load change history:', err);
        setError('Failed to load change history');
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [budgetId, refreshKey]); // Add refreshKey to dependency array

  const formatDateTime = (dateString: string) => {
    return formatDateInTimezone(dateString);
  };

  const getChangeTypeDisplayName = (changeType: string, changeDescription: string, fieldName?: string) => {
    switch (changeType) {
      case 'status_change':
        if (changeDescription.includes('finished') || changeDescription.includes('marked as finished')) {
          return 'Finished Budget';
        } else if (changeDescription.includes('reopened') || changeDescription.includes('editing')) {
          return 'Reopened Budget';
        }
        return 'Status Changed';
      case 'title_change':
        return 'Edited Title';
      case 'field_change':
        return fieldName ? `Edited ${fieldName}` : 'Edited Budget';
      case 'creation':
        return 'Budget Created';
      default:
        return 'Unknown Action';
    }
  };

  const getOldNewValues = (entry: BudgetChangeHistoryEntry) => {
    if (entry.oldValue && entry.newValue) {
      return {
        oldValue: entry.oldValue,
        newValue: entry.newValue
      };
    }
    
    // For status changes, provide meaningful old/new values
    if (entry.changeType === 'status_change') {
      if (entry.changeDescription.includes('finished')) {
        return {
          oldValue: 'In Progress',
          newValue: 'Finished'
        };
      } else if (entry.changeDescription.includes('unfinished') || entry.changeDescription.includes('editing')) {
        return {
          oldValue: 'Finished',
          newValue: 'In Progress'
        };
      }
    }
    
    return {
      oldValue: '-',
      newValue: '-'
    };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Change History</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Change History</h2>
        {history.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isExpanded ? 'Show Less' : `Show All (${history.length})`}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No changes recorded yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700 w-32">Date & Time</th>
                <th className="text-left p-3 font-medium text-slate-700 w-40">Action</th>
                <th className="text-left p-3 font-medium text-slate-700 w-24">Old Value</th>
                <th className="text-left p-3 font-medium text-slate-700 w-24">New Value</th>
                <th className="text-left p-3 font-medium text-slate-700 flex-1">Notes</th>
                <th className="text-left p-3 font-medium text-slate-700 w-20">Future</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(isExpanded ? history : history.slice(0, 3)).map((entry) => {
                const dateTime = formatDateTime(entry.changedAt);
                const values = getOldNewValues(entry);
                const actionName = getChangeTypeDisplayName(entry.changeType, entry.changeDescription, entry.fieldName);
                
                return (
                  <tr key={entry.changeId} className="hover:bg-slate-25 transition-colors duration-150">
                    <td className="p-3 text-sm">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">
                          {typeof dateTime === 'object' ? dateTime.date : 'Invalid Date'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {typeof dateTime === 'object' ? dateTime.time : 'Invalid Time'}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{actionName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      <span className="text-slate-600 bg-slate-50 px-2 py-1 rounded text-xs">
                        {values.oldValue}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      <span className="text-slate-900 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                        {values.newValue}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-600">
                      {entry.changeDescription}
                    </td>
                    <td className="p-3 text-sm text-slate-400">
                      {/* Reserved for future use */}
                      <div className="w-4 h-4"></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BudgetChangeHistory;

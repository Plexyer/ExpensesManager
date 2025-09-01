import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Calendar, FileText, Edit2, Trash2 } from 'lucide-react';
import { RootState } from '../../../store/store';
import { 
  fetchLedger, 
  addEntry, 
  updateEntry, 
  deleteEntry 
} from '../../../store/slices/budgetSlice';
import { useTimezone } from '../../../contexts/TimezoneContext';
import { CategoryStats, NewEntry, LedgerEntry, EntryType, UpdateEntry } from '../../../types/budget';

interface CategoryLedgerModalProps {
  categoryId: number;
  category?: CategoryStats;
  onClose: () => void;
  onEntryAdded: () => void;
}

function CategoryLedgerModal({ categoryId, category, onClose, onEntryAdded }: CategoryLedgerModalProps) {
  const dispatch = useDispatch();
  const { ledgerByCategoryId } = useSelector((state: RootState) => state.budget);
  const { formatDateInTimezone } = useTimezone();
  
  const [entryType, setEntryType] = useState<EntryType>('expense');
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<UpdateEntry>>({});

  const entries = ledgerByCategoryId[categoryId] || [];

  // Load ledger entries when modal opens
  useEffect(() => {
    dispatch(fetchLedger({ categoryId }) as any);
  }, [categoryId, dispatch]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!what.trim()) newErrors.what = 'Description is required';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!date) newErrors.date = 'Date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const payload: NewEntry = {
        categoryId,
        entryType,
        what: what.trim(),
        where: where.trim() || undefined,
        amount: parseFloat(amount),
        date,
      };
      
      await dispatch(addEntry(payload) as any);
      
      // Reset form
      setWhat('');
      setWhere('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setErrors({});
      
      onEntryAdded();
    } catch (error) {
      console.error('Failed to add entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStart = (entry: LedgerEntry) => {
    setEditingEntryId(entry.entryId);
    setEditForm({
      entryId: entry.entryId,
      entryType: entry.entryType,
      what: entry.what,
      where: entry.where || '',
      amount: entry.amount,
      date: entry.date,
    });
  };

  const handleEditSave = async () => {
    if (!editForm.entryId || !editForm.what?.trim() || !editForm.amount || editForm.amount <= 0) {
      return;
    }

    const updatePayload: UpdateEntry = {
      entryId: editForm.entryId,
      entryType: editForm.entryType!,
      what: editForm.what.trim(),
      where: editForm.where?.trim(),
      amount: editForm.amount,
      date: editForm.date!,
    };

    await dispatch(updateEntry(updatePayload) as any);
    setEditingEntryId(null);
    setEditForm({});
    onEntryAdded(); // Refresh parent
  };

  const handleEditCancel = () => {
    setEditingEntryId(null);
    setEditForm({});
  };

  const handleDelete = async (entryId: number) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      await dispatch(deleteEntry(entryId) as any);
      onEntryAdded(); // Refresh parent
    }
  };

  const formatDateTime = (dateString: string) => {
    return formatDateInTimezone(dateString);
  };

  const getEntryTypeIcon = (type: EntryType) => {
    switch (type) {
      case 'income': return '+';
      case 'expense': return '-';
      case 'adjustment': return '±';
    }
  };

  const getEntryTypeColor = (type: EntryType) => {
    switch (type) {
      case 'income': return 'text-green-600';
      case 'expense': return 'text-red-600';
      case 'adjustment': return 'text-blue-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {category ? category.name : `Category ${categoryId}`} Ledger
            </h2>
            {category && (
              <p className="text-sm text-slate-600 mt-1">
                Net: <span className={category.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(category.net)}
                </span>
                {' • '}
                Remaining: <span className={category.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(category.remaining)}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-120px)]">
          {/* Add Entry Form */}
          <div className="lg:w-1/3 p-6 border-r border-slate-200 bg-slate-50">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Add Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type
                </label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as EntryType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="expense">Expense (Outflow)</option>
                  <option value="income">Income (Inflow)</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What *
                </label>
                <input
                  type="text"
                  value={what}
                  onChange={(e) => setWhat(e.target.value)}
                  placeholder="e.g., Coffee, Groceries"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.what ? 'border-red-300' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.what && <p className="mt-1 text-sm text-red-600">{errors.what}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Where
                </label>
                <input
                  type="text"
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  placeholder="e.g., Starbucks, Walmart (optional)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.amount ? 'border-red-300' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.date ? 'border-red-300' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Entry'}
              </button>
            </form>
          </div>

          {/* Entries List */}
          <div className="lg:w-2/3 flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">
                Recent Entries ({entries.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-auto">
              {entries.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No entries yet</p>
                  <p className="text-sm text-slate-500">Add your first entry using the form</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {entries.map((entry) => (
                    <div
                      key={entry.entryId}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      {editingEntryId === entry.entryId ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <select
                              value={editForm.entryType}
                              onChange={(e) => setEditForm({...editForm, entryType: e.target.value as EntryType})}
                              className="px-2 py-1 text-sm border border-slate-300 rounded"
                            >
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                              <option value="adjustment">Adjustment</option>
                            </select>
                            <input
                              type="text"
                              value={editForm.what}
                              onChange={(e) => setEditForm({...editForm, what: e.target.value})}
                              className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded"
                              placeholder="What"
                            />
                            <input
                              type="number"
                              value={editForm.amount}
                              onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                              step="0.01"
                              min="0.01"
                              className="w-24 px-2 py-1 text-sm border border-slate-300 rounded"
                            />
                          </div>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={editForm.where || ''}
                              onChange={(e) => setEditForm({...editForm, where: e.target.value})}
                              className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded"
                              placeholder="Where (optional)"
                            />
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                              className="px-2 py-1 text-sm border border-slate-300 rounded"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleEditSave}
                              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="px-3 py-1 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`text-lg font-mono ${getEntryTypeColor(entry.entryType)}`}>
                              {getEntryTypeIcon(entry.entryType)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-slate-900">{entry.what}</span>
                                {entry.where && (
                                  <span className="text-sm text-slate-500">@ {entry.where}</span>
                                )}
                              </div>
                              <div className="text-sm text-slate-600 flex items-center space-x-4">
                                <span className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDateTime(entry.date).date}
                                </span>
                                <span className="text-xs text-slate-500">
                                  Added {formatDateTime(entry.createdAt).date}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`font-semibold ${getEntryTypeColor(entry.entryType)}`}>
                              {formatCurrency(entry.amount)}
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEditStart(entry)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Edit entry"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.entryId)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoryLedgerModal;

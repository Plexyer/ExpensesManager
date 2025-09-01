import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Bookmark, Calendar } from 'lucide-react';
import { RootState } from '../../../store/store';
import { fetchTemplates, createTemplate, applyTemplateToBudget } from '../../../store/slices/budgetSlice';

function TemplatesPage() {
  const dispatch = useDispatch();
  const { templates, budgets, loading } = useSelector((state: RootState) => state.budget);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchTemplates() as any);
  }, [dispatch]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTemplateName.trim()) {
      await dispatch(createTemplate(newTemplateName.trim()) as any);
      setNewTemplateName('');
      setShowCreateForm(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (selectedTemplateId && selectedBudgetId) {
      await dispatch(applyTemplateToBudget({ 
        templateId: selectedTemplateId, 
        budgetId: selectedBudgetId 
      }) as any);
      alert('Template applied successfully!');
      setSelectedBudgetId(null);
      setSelectedTemplateId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMonthName = (month: number) => {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return names[month - 1];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Budget Templates</h2>
          <p className="text-slate-600 mt-1">Create reusable budget templates to quickly set up new budgets</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Create Template Form */}
      {showCreateForm && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <form onSubmit={handleCreateTemplate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Template name (e.g., Monthly Household Budget)"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Templates List */}
        <div className="bg-white rounded-lg shadow-financial border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 flex items-center">
              <Bookmark className="w-5 h-5 mr-2" />
              Available Templates ({templates.length})
            </h3>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-slate-600">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-slate-900 mb-2">No templates yet</h4>
                <p className="text-slate-600 mb-4">Create your first budget template to get started</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.templateId}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplateId === template.templateId
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedTemplateId(
                      selectedTemplateId === template.templateId ? null : template.templateId
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900">{template.name}</h4>
                        <p className="text-sm text-slate-600">
                          Created {formatDate(template.createdAt)}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedTemplateId === template.templateId
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-slate-300'
                      }`}>
                        {selectedTemplateId === template.templateId && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Apply to Budget */}
        <div className="bg-white rounded-lg shadow-financial border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Apply Template to Budget
            </h3>
          </div>
          
          <div className="p-6">
            {selectedTemplateId ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Selected Template:
                  </label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-medium text-blue-900">
                      {templates.find(t => t.templateId === selectedTemplateId)?.name}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Apply to Budget:
                  </label>
                  <select
                    value={selectedBudgetId || ''}
                    onChange={(e) => setSelectedBudgetId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a budget...</option>
                    {budgets.map((budget) => (
                      <option key={budget.budgetId} value={budget.budgetId}>
                        {budget.name || `${getMonthName(budget.month)} ${budget.year}`}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleApplyTemplate}
                  disabled={!selectedBudgetId}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Apply Template
                </button>

                <div className="text-sm text-slate-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <strong>Note:</strong> This will create new categories in the selected budget based on the template. 
                  Existing categories will not be affected.
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Select a template to apply it to a budget</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplatesPage;

import React, { useState, useEffect } from 'react';
import { Bookmark, Check, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface BudgetTemplate {
  template_id: number;
  name: string;
  description?: string;
  created_at: string;
  category_count: number;
  total_amount: number;
}

interface TemplateSelectorProps {
  budgetId: number;
  onTemplateApplied: () => void;
  onCancel?: () => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ budgetId, onTemplateApplied, onCancel }) => {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<BudgetTemplate[]>('get_budget_templates');
      setTemplates(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setApplying(true);
      await invoke('apply_template_to_budget', { 
        budgetId, 
        templateId: selectedTemplate 
      });
      onTemplateApplied();
    } catch (err) {
      setError(err as string);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center mb-4">
        <Bookmark className="w-6 h-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Select a Template</h2>
      </div>
      
      <p className="text-gray-600 mb-6">
        Choose a template to set up your budget categories and amounts automatically.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-8">
          <Bookmark className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No templates available.</p>
          <p className="text-sm text-gray-400">
            Create templates in the Templates page to quickly set up budgets.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.template_id}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  selectedTemplate === template.template_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTemplate(template.template_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{template.category_count} categories</span>
                      <span>${template.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                  {selectedTemplate === template.template_id && (
                    <Check className="w-5 h-5 text-blue-600 ml-2" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || applying}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {applying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Applying Template...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Apply Template
                </>
              )}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={applying}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TemplateSelector;

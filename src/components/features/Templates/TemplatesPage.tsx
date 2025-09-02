import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Bookmark, Eye, Users } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import MigrationRunner from '../../MigrationRunner';

interface GlobalCategory {
  global_category_id: number;
  name: string;
  description?: string;
  created_at: string;
}

interface BudgetTemplate {
  template_id: number;
  name: string;
  description?: string;
  created_at: string;
  category_count: number;
  total_amount: number;
}

interface TemplateCategoryItem {
  template_category_id: number;
  global_category_id: number;
  category_name: string;
  allocated_amount: number;
  category_type: string;
  sort_order: number;
}

interface BudgetTemplateWithCategories {
  template_id: number;
  name: string;
  description?: string;
  created_at: string;
  categories: TemplateCategoryItem[];
}

interface CreateTemplateCategoryArgs {
  global_category_id: number;
  allocated_amount: number;
  category_type: string;
  sort_order: number;
}

interface CreateBudgetTemplateArgs {
  name: string;
  description?: string;
  categories: CreateTemplateCategoryArgs[];
}

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [globalCategories, setGlobalCategories] = useState<GlobalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  
  // Template creation/editing states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BudgetTemplateWithCategories | null>(null);
  const [newTemplate, setNewTemplate] = useState<CreateBudgetTemplateArgs>({
    name: '',
    description: '',
    categories: []
  });
  
  // Template viewing state
  const [viewingTemplate, setViewingTemplate] = useState<BudgetTemplateWithCategories | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedsMigration(false);
      
      const [templatesResult, categoriesResult] = await Promise.all([
        invoke<BudgetTemplate[]>('get_budget_templates'),
        invoke<GlobalCategory[]>('get_global_categories')
      ]);
      
      setTemplates(templatesResult);
      setGlobalCategories(categoriesResult);
    } catch (err) {
      const errorStr = String(err);
      if (errorStr.includes('no such table') || errorStr.includes('budget_templates') || errorStr.includes('global_categories')) {
        setNeedsMigration(true);
        setError(null);
      } else {
        setError(errorStr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMigrationComplete = () => {
    setNeedsMigration(false);
    loadData();
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || newTemplate.categories.length === 0) return;

    try {
      await invoke<BudgetTemplateWithCategories>('create_budget_template', { args: newTemplate });
      setNewTemplate({ name: '', description: '', categories: [] });
      setShowCreateForm(false);
      loadData();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleEditTemplate = async (templateId: number) => {
    try {
      const template = await invoke<BudgetTemplateWithCategories>('get_budget_template_with_categories', { templateId });
      setEditingTemplate(template);
      setNewTemplate({
        name: template.name,
        description: template.description || '',
        categories: template.categories.map(cat => ({
          global_category_id: cat.global_category_id,
          allocated_amount: cat.allocated_amount,
          category_type: cat.category_type,
          sort_order: cat.sort_order
        }))
      });
    } catch (err) {
      setError(err as string);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !newTemplate.name.trim() || newTemplate.categories.length === 0) return;

    try {
      await invoke<BudgetTemplateWithCategories>('update_budget_template', { 
        templateId: editingTemplate.template_id, 
        args: newTemplate 
      });
      setEditingTemplate(null);
      setNewTemplate({ name: '', description: '', categories: [] });
      loadData();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await invoke('delete_budget_template', { templateId });
      loadData();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleViewTemplate = async (templateId: number) => {
    try {
      const template = await invoke<BudgetTemplateWithCategories>('get_budget_template_with_categories', { templateId });
      setViewingTemplate(template);
    } catch (err) {
      setError(err as string);
    }
  };

  const addCategoryToTemplate = () => {
    // Find the first global category that's not already in the template
    const usedCategoryIds = new Set(newTemplate.categories.map(cat => cat.global_category_id));
    const availableCategory = globalCategories.find(cat => !usedCategoryIds.has(cat.global_category_id));
    
    if (!availableCategory) {
      setError("All available categories have already been added to this template.");
      return;
    }

    setNewTemplate(prev => ({
      ...prev,
      categories: [...prev.categories, {
        global_category_id: availableCategory.global_category_id,
        allocated_amount: 0,
        category_type: 'expense',
        sort_order: prev.categories.length
      }]
    }));
  };

  const removeCategoryFromTemplate = (index: number) => {
    setNewTemplate(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  const updateTemplateCategory = (index: number, field: keyof CreateTemplateCategoryArgs, value: any) => {
    setNewTemplate(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => i === index ? { ...cat, [field]: value } : cat)
    }));
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setNewTemplate({ name: '', description: '', categories: [] });
    setShowCreateForm(false);
  };

  const getTotalAmount = (categories: CreateTemplateCategoryArgs[]) => {
    return categories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading templates...</div>
        </div>
      </div>
    );
  }

  if (needsMigration) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Templates</h1>
          <p className="text-gray-600">Create and manage budget templates with pre-configured categories.</p>
        </div>
        <MigrationRunner onMigrationComplete={handleMigrationComplete} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Templates</h1>
        <p className="text-gray-600">Create and manage budget templates with pre-configured categories.</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create/Edit Template Form */}
      {(showCreateForm || editingTemplate) && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h2>
          
          <div className="space-y-4">
            {/* Template Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Monthly Budget, Student Budget"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Template Categories */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Categories ({newTemplate.categories.length})
                </label>
                <button
                  onClick={addCategoryToTemplate}
                  disabled={globalCategories.length === 0 || newTemplate.categories.length >= globalCategories.length}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </div>

              {newTemplate.categories.length === 0 ? (
                <div className="text-center py-6 border border-gray-200 rounded-md bg-gray-50">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No categories added yet</p>
                  <p className="text-sm text-gray-400">Add categories to define your template</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {newTemplate.categories.map((category, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-gray-50 p-3 rounded-md">
                      <div className="col-span-4">
                        <select
                          value={category.global_category_id}
                          onChange={(e) => updateTemplateCategory(index, 'global_category_id', parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {globalCategories
                            .filter(cat => 
                              cat.global_category_id === category.global_category_id || 
                              !newTemplate.categories.some(tempCat => tempCat.global_category_id === cat.global_category_id)
                            )
                            .map(cat => (
                              <option key={cat.global_category_id} value={cat.global_category_id}>
                                {cat.name}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={category.allocated_amount}
                          onChange={(e) => updateTemplateCategory(index, 'allocated_amount', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Amount"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={category.category_type}
                          onChange={(e) => updateTemplateCategory(index, 'category_type', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="expense">Expense</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <button
                          onClick={() => removeCategoryFromTemplate(index)}
                          className="w-full flex items-center justify-center py-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {newTemplate.categories.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  Total Amount: <span className="font-medium">${getTotalAmount(newTemplate.categories).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                disabled={!newTemplate.name.trim() || newTemplate.categories.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Templates ({templates.length})
          </h2>
          {!showCreateForm && !editingTemplate && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          )}
        </div>

        <div className="p-4">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
              <p className="text-gray-600 mb-4">Create your first budget template to get started</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Your First Template
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.template_id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{template.category_count} categories</span>
                        <span>${template.total_amount.toFixed(2)} total</span>
                        <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleViewTemplate(template.template_id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="View template details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditTemplate(template.template_id)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-md"
                        title="Edit template"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.template_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Details Modal */}
      {viewingTemplate && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{viewingTemplate.name}</h2>
                <button
                  onClick={() => setViewingTemplate(null)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {viewingTemplate.description && (
                <p className="text-gray-600 mb-4">{viewingTemplate.description}</p>
              )}

              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Template Categories</h3>
                <div className="space-y-2">
                  {viewingTemplate.categories.map((category) => (
                    <div key={category.template_category_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <span className="font-medium">{category.category_name}</span>
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {category.category_type}
                        </span>
                      </div>
                      <span className="font-medium">${category.allocated_amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center font-medium">
                    <span>Total Amount:</span>
                    <span>${viewingTemplate.categories.reduce((sum, cat) => sum + cat.allocated_amount, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Created: {new Date(viewingTemplate.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;

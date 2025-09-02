import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import MigrationRunner from './MigrationRunner';

interface GlobalCategory {
  global_category_id: number;
  name: string;
  description?: string;
  created_at: string;
}

interface CreateCategoryArgs {
  name: string;
  description?: string;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState<CreateCategoryArgs>({ name: '', description: '' });
  const [editCategory, setEditCategory] = useState<CreateCategoryArgs>({ name: '', description: '' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedsMigration(false);
      const result = await invoke<GlobalCategory[]>('get_global_categories');
      setCategories(result);
    } catch (err) {
      const errorStr = String(err);
      if (errorStr.includes('no such table') || errorStr.includes('global_categories')) {
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
    loadCategories();
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;

    try {
      const created = await invoke<GlobalCategory>('create_global_category', { args: newCategory });
      setCategories([...categories, created]);
      setNewCategory({ name: '', description: '' });
      setIsCreating(false);
    } catch (err) {
      setError(err as string);
    }
  };

  const handleUpdateCategory = async (categoryId: number) => {
    if (!editCategory.name.trim()) return;

    try {
      const updated = await invoke<GlobalCategory>('update_global_category', {
        categoryId,
        args: editCategory
      });
      setCategories(categories.map(cat => 
        cat.global_category_id === categoryId ? updated : cat
      ));
      setEditingId(null);
      setEditCategory({ name: '', description: '' });
    } catch (err) {
      setError(err as string);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? This will also remove it from all templates.')) {
      return;
    }

    try {
      await invoke('delete_global_category', { categoryId });
      setCategories(categories.filter(cat => cat.global_category_id !== categoryId));
    } catch (err) {
      setError(err as string);
    }
  };

  const startEdit = (category: GlobalCategory) => {
    setEditingId(category.global_category_id);
    setEditCategory({
      name: category.name,
      description: category.description || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCategory({ name: '', description: '' });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </div>
    );
  }

  if (needsMigration) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Categories</h1>
          <p className="text-gray-600">Manage global categories that can be used in budget templates.</p>
        </div>
        <MigrationRunner onMigrationComplete={handleMigrationComplete} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Categories</h1>
        <p className="text-gray-600">Manage global categories that can be used in budget templates.</p>
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

      {/* Create New Category */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Create New Category</h2>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          )}
        </div>

        {isCreating && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Groceries, Rent, Entertainment"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Optional description for this category"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateCategory}
                disabled={!newCategory.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Category
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewCategory({ name: '', description: '' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Categories ({categories.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {categories.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No categories created yet.</p>
              <button
                onClick={() => setIsCreating(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first category
              </button>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.global_category_id} className="p-4">
                {editingId === category.global_category_id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={editCategory.name}
                        onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editCategory.description}
                        onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateCategory(category.global_category_id)}
                        disabled={!editCategory.name.trim()}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-gray-600 text-sm mt-1">
                          {category.description}
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-2">
                        Created: {new Date(category.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(category)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.global_category_id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;

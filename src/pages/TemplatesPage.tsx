import { useState, useEffect, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  selectTemplate,
  fetchTemplateCategories,
  addCategoryToTemplate,
  removeCategoryFromTemplate,
  updateTemplateCategoryAmount,
  reorderTemplateCategories,
  setTemplateCategoriesOrder,
  clearTemplateError,
} from "../store/slices/templateSlice";
import { fetchCategories, createCategory, clearCategoryError } from "../store/slices/categorySlice";
import AppHeader from "../components/common/AppHeader";
import type { Cadence, Currency, CreateTemplateArgs, TemplateCategory } from "../types/template.types";
import { CADENCE_OPTIONS, CURRENCY_OPTIONS } from "../types/template.types";
import Onboarding from "../components/features/Onboarding/Onboarding";
import TemplateCategoryList from "../components/features/Templates/TemplateCategoryList";

/**
 * Page for managing budget templates.
 * Allows creating, editing, and deleting templates with cadence settings.
 */
const TemplatesPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isFileOpen } = useAppSelector((state) => state.file);
  const { templates, selectedTemplate, templateCategories, isLoading, isCategoriesLoading, error: templateError } = useAppSelector(
    (state) => state.templates
  );
  const { categories, error: categoryError } = useAppSelector((state) => state.categories);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCadence, setFormCadence] = useState<Cadence>("monthly");
  const [formCurrency, setFormCurrency] = useState<Currency>("CHF");

  // Add category state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [categoryAmount, setCategoryAmount] = useState("");

  // New category inline creation
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  // Load data on mount
  useEffect(() => {
    if (isFileOpen) {
      dispatch(fetchTemplates());
      dispatch(fetchCategories());
    }
  }, [dispatch, isFileOpen]);

  // Load categories when template selected
  useEffect(() => {
    if (selectedTemplate) {
      dispatch(fetchTemplateCategories(selectedTemplate.template_id));
    }
  }, [dispatch, selectedTemplate]);

  // Show onboarding if no file is open
  if (!isFileOpen) {
    return <Onboarding />;
  }

  // Helper to reset form
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormCadence("monthly");
    setFormCurrency("CHF");
    setIsCreating(false);
    setIsEditing(false);
  };

  // Handle template creation
  const handleCreateTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const args: CreateTemplateArgs = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      cadence: formCadence,
      default_currency: formCurrency,
    };

    try {
      await dispatch(createTemplate(args)).unwrap();
      resetForm();
    } catch {
      // Error handled by Redux
    }
  };

  // Handle template update
  const handleUpdateTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !formName.trim()) return;

    try {
      await dispatch(
        updateTemplate({
          templateId: selectedTemplate.template_id,
          args: {
            name: formName.trim(),
            description: formDescription.trim() || null,
            cadence: formCadence,
            default_currency: formCurrency,
          },
        })
      ).unwrap();
      setIsEditing(false);
    } catch {
      // Error handled by Redux
    }
  };

  // Handle template deletion
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    if (!window.confirm(t("templates.confirmDelete", { name: selectedTemplate.name }))) return;

    try {
      await dispatch(deleteTemplate(selectedTemplate.template_id)).unwrap();
    } catch {
      // Error handled by Redux
    }
  };

  // Handle template selection
  const handleSelectTemplate = (templateId: number) => {
    const template = templates.find((t) => t.template_id === templateId);
    dispatch(selectTemplate(template || null));
    setIsEditing(false);
    setShowAddCategory(false);
  };

  // Handle edit mode
  const handleStartEdit = () => {
    if (!selectedTemplate) return;
    setFormName(selectedTemplate.name);
    setFormDescription(selectedTemplate.description || "");
    setFormCadence(selectedTemplate.cadence);
    setFormCurrency(selectedTemplate.default_currency);
    setIsEditing(true);
  };

  // Handle add category to template
  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || selectedCategoryId === "" || !categoryAmount) return;

    try {
      await dispatch(
        addCategoryToTemplate({
          template_id: selectedTemplate.template_id,
          global_category_id: selectedCategoryId as number,
          allocated_amount: parseFloat(categoryAmount),
        })
      ).unwrap();
      setShowAddCategory(false);
      setSelectedCategoryId("");
      setCategoryAmount("");
    } catch {
      // Error handled by Redux
    }
  };

  // Handle remove category from template
  const handleRemoveCategory = async (templateCategoryId: number) => {
    if (!window.confirm(t("templates.confirmRemoveCategory"))) return;
    try {
      await dispatch(removeCategoryFromTemplate(templateCategoryId)).unwrap();
    } catch {
      // Error handled by Redux
    }
  };

  // Handle inline edit of a template category amount
  const handleUpdateCategoryAmount = async (templateCategoryId: number, allocatedAmount: number) => {
    try {
      await dispatch(updateTemplateCategoryAmount({ templateCategoryId, allocatedAmount })).unwrap();
    } catch {
      // Error handled by Redux
    }
  };

  // Handle category reorder via drag-and-drop
  const handleReorderCategories = (reordered: TemplateCategory[]) => {
    if (!selectedTemplate) return;
    // Optimistic update: immediately reorder in Redux state
    dispatch(setTemplateCategoriesOrder(reordered));
    // Persist to database in the background
    const orderedIds = reordered.map((tc) => tc.template_category_id);
    dispatch(reorderTemplateCategories({ templateId: selectedTemplate.template_id, orderedIds }));
  };

  // Handle inline category creation
  const handleCreateNewCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const result = await dispatch(
        createCategory({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
        })
      ).unwrap();
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowNewCategory(false);
      // Auto-select the new category
      setSelectedCategoryId(result.global_category_id);
    } catch {
      // Error handled by Redux
    }
  };

  // Get categories not yet added to template
  const availableCategories = categories.filter(
    (cat) => !templateCategories.some((tc) => tc.global_category_id === cat.global_category_id)
  );

  // Clear errors
  const handleClearErrors = () => {
    dispatch(clearTemplateError());
    dispatch(clearCategoryError());
  };

  const error = templateError || categoryError;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <AppHeader />

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
              <span className="text-red-400 text-sm">{error}</span>
              <button
                onClick={handleClearErrors}
                className="text-red-400 hover:text-red-300"
                aria-label={t("common.dismiss")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex gap-6">
            {/* Left Panel: Template List */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">{t("templates.title")}</h2>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsCreating(true);
                      dispatch(selectTemplate(null));
                    }}
                    className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    type="button"
                    disabled={isLoading}
                  >
                    {t("templates.new")}
                  </button>
                </div>

                {/* Template list */}
                <div className="space-y-1" role="listbox" aria-label={t("templates.budgetTemplates")}>
                  {templates.length === 0 && !isLoading && (
                    <p className="text-slate-500 text-sm py-4 text-center">{t("templates.noTemplatesYet")}</p>
                  )}
                  {templates.map((template) => (
                    <button
                      key={template.template_id}
                      onClick={() => handleSelectTemplate(template.template_id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        selectedTemplate?.template_id === template.template_id
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                      type="button"
                      role="option"
                      aria-selected={selectedTemplate?.template_id === template.template_id}
                    >
                      <span className="block font-medium truncate">{template.name}</span>
                      <span className="block text-xs text-slate-500 capitalize">{template.cadence}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: Details / Form */}
            <div className="flex-1">
              {/* Create form */}
              {isCreating && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">{t("templates.createTemplate")}</h2>
                  <form onSubmit={handleCreateTemplate} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                        {t("templates.name")} *
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder={t("templates.namePlaceholder")}
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
                        {t("templates.description")}
                      </label>
                      <textarea
                        id="description"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder={t("templates.descriptionPlaceholder")}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cadence" className="block text-sm font-medium text-slate-300 mb-1">
                          {t("templates.cadence")} *
                        </label>
                        <select
                          id="cadence"
                          value={formCadence}
                          onChange={(e) => setFormCadence(e.target.value as Cadence)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {CADENCE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-slate-300 mb-1">
                          {t("templates.currency")} *
                        </label>
                        <select
                          id="currency"
                          value={formCurrency}
                          onChange={(e) => setFormCurrency(e.target.value as Currency)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {CURRENCY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        disabled={isLoading}
                      >
                        {isLoading ? t("templates.creating") : t("templates.createTemplate")}
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Selected template view */}
              {selectedTemplate && !isCreating && (
                <div className="space-y-6">
                  {/* Template details */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    {isEditing ? (
                      <>
                        <h2 className="text-lg font-semibold text-white mb-4">{t("templates.editTemplate")}</h2>
                        <form onSubmit={handleUpdateTemplate} className="space-y-4">
                          <div>
                            <label htmlFor="edit-name" className="block text-sm font-medium text-slate-300 mb-1">
                              {t("templates.name")} *
                            </label>
                            <input
                              id="edit-name"
                              type="text"
                              value={formName}
                              onChange={(e) => setFormName(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="edit-description" className="block text-sm font-medium text-slate-300 mb-1">
                              {t("templates.description")}
                            </label>
                            <textarea
                              id="edit-description"
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="edit-cadence" className="block text-sm font-medium text-slate-300 mb-1">
                                {t("templates.cadence")} *
                              </label>
                              <select
                                id="edit-cadence"
                                value={formCadence}
                                onChange={(e) => setFormCadence(e.target.value as Cadence)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                {CADENCE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="edit-currency" className="block text-sm font-medium text-slate-300 mb-1">
                                {t("templates.currency")} *
                              </label>
                              <select
                                id="edit-currency"
                                value={formCurrency}
                                onChange={(e) => setFormCurrency(e.target.value as Currency)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                {CURRENCY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              disabled={isLoading}
                            >
                              {isLoading ? t("templates.saving") : t("templates.saveChanges")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditing(false)}
                              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h2 className="text-xl font-semibold text-white">{selectedTemplate.name}</h2>
                            {selectedTemplate.description && (
                              <p className="text-slate-400 text-sm mt-1">{selectedTemplate.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleStartEdit}
                              className="px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              type="button"
                            >
                              {t("templates.edit")}
                            </button>
                            <button
                              onClick={handleDeleteTemplate}
                              className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                              type="button"
                            >
                              {t("templates.delete")}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">{t("templates.cadence")}:</span>
                            <span className="ml-2 text-white capitalize">{selectedTemplate.cadence}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">{t("templates.currency")}:</span>
                            <span className="ml-2 text-white">{selectedTemplate.default_currency}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Template categories */}
                  {!isEditing && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">{t("templates.categories")}</h3>
                        <button
                          onClick={() => setShowAddCategory(true)}
                          className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          type="button"
                        >
                          {t("templates.addCategory")}
                        </button>
                      </div>

                      {/* Add category form */}
                      {showAddCategory && (
                        <div className="mb-4 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                          <form onSubmit={handleAddCategory} className="space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label htmlFor="category-select" className="sr-only">
                                  {t("templates.selectCategory")}
                                </label>
                                <select
                                  id="category-select"
                                  value={selectedCategoryId}
                                  onChange={(e) =>
                                    setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : "")
                                  }
                                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                  <option value="">{t("templates.selectCategory")}...</option>
                                  {availableCategories.map((cat) => (
                                    <option key={cat.global_category_id} value={cat.global_category_id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-32">
                                <label htmlFor="category-amount" className="sr-only">
                                  {t("templates.defaultAmount")}
                                </label>
                                <input
                                  id="category-amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={categoryAmount}
                                  onChange={(e) => setCategoryAmount(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  placeholder={t("ledger.amount")}
                                />
                              </div>
                            </div>

                            {/* Inline new category creation */}
                            {!showNewCategory ? (
                              <button
                                type="button"
                                onClick={() => setShowNewCategory(true)}
                                className="text-sm text-emerald-400 hover:text-emerald-300"
                              >
                                {t("templates.createNewCategory")}
                              </button>
                            ) : (
                              <div className="p-3 bg-slate-600/50 border border-slate-500 rounded-lg space-y-2">
                                <input
                                  type="text"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                  placeholder={t("templates.categoryName")}
                                />
                                <input
                                  type="text"
                                  value={newCategoryDescription}
                                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                  placeholder={t("templates.descriptionOptional")}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleCreateNewCategory}
                                    className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                                    disabled={!newCategoryName.trim()}
                                  >
                                    {t("templates.create")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowNewCategory(false);
                                      setNewCategoryName("");
                                      setNewCategoryDescription("");
                                    }}
                                    className="px-3 py-1.5 text-sm text-slate-300 hover:text-white"
                                  >
                                    {t("common.cancel")}
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <button
                                type="submit"
                                className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                disabled={selectedCategoryId === "" || !categoryAmount}
                              >
                                {t("templates.addToTemplate")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddCategory(false);
                                  setSelectedCategoryId("");
                                  setCategoryAmount("");
                                  setShowNewCategory(false);
                                }}
                                className="px-3 py-1.5 text-sm text-slate-300 hover:text-white"
                              >
                                {t("common.cancel")}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Category list with drag-and-drop reordering */}
                      <div className={`relative transition-opacity duration-150 ${isCategoriesLoading ? "opacity-50 pointer-events-none" : ""}`}>
                        <TemplateCategoryList
                          categories={templateCategories}
                          currency={selectedTemplate.default_currency}
                          onRemove={handleRemoveCategory}
                          onUpdateAmount={handleUpdateCategoryAmount}
                          onReorder={handleReorderCategories}
                        />
                        {/* Loading spinner overlay */}
                        {isCategoriesLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!selectedTemplate && !isCreating && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-700/50 border border-slate-600 flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">{t("templates.budgetTemplates")}</h2>
                  <p className="text-slate-400 mb-4">
                    {t("templates.emptyDescription")}
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsCreating(true);
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    type="button"
                  >
                    {t("templates.createFirstTemplate")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TemplatesPage;

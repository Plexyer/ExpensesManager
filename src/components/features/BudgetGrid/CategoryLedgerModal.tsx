import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  listLineItems,
  createLineItem,
  updateLineItem,
  deleteLineItem,
} from "../../../services/lineItemService";
import type { LineItem } from "../../../types/lineItem.types";
import type { LedgerModalState } from "./types";
import { formatErrorMessage } from "../../../utils/formatErrorMessage";
import { formatCurrency } from "../../../utils/currency";
import { formatDate, formatTime } from "../../../utils/dateFormat";

interface CategoryLedgerModalProps {
  /** Which category + kind to display */
  ledgerState: LedgerModalState;
  /** Category name for the modal title */
  categoryName: string;
  /** Currency code for formatting, e.g. "CHF" */
  currency: string;
  /** Close callback */
  onClose: () => void;
  /** Called after a transaction is created/updated/deleted so the grid can refresh. */
  onDataChanged?: () => void;
}

/** Get today's date in YYYY-MM-DD format for the date input default. */
const getTodayISO = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Extract YYYY-MM-DD from an ISO datetime string. */
const extractDatePart = (isoString: string): string => {
  try {
    return isoString.substring(0, 10);
  } catch {
    return getTodayISO();
  }
};

const CategoryLedgerModal = ({
  ledgerState,
  categoryName,
  currency,
  onClose,
  onDataChanged,
}: CategoryLedgerModalProps) => {
  const { t } = useTranslation();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Entry / Edit form state ──
  const [formDate, setFormDate] = useState(getTodayISO());
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // ── Delete confirmation state ──
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const kindLabel = ledgerState.kind === "received" ? t("ledger.received") : t("ledger.spent");
  const isEditMode = editingItem !== null;

  // ── Fetch line items ──
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listLineItems(
        ledgerState.budgetInstanceCategoryId,
        ledgerState.kind
      );
      setLineItems(items);
    } catch (err) {
      setError(formatErrorMessage(err, t("ledger.failedToLoadItems")));
    } finally {
      setLoading(false);
    }
  }, [ledgerState.budgetInstanceCategoryId, ledgerState.kind]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Focus the modal on mount for accessibility
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Focus date input when form opens
  useEffect(() => {
    if (showForm) {
      dateInputRef.current?.focus();
    }
  }, [showForm]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (deletingItemId !== null) {
          setDeletingItemId(null);
          setDeleteError(null);
        } else if (showForm) {
          setShowForm(false);
          resetForm();
        } else {
          onClose();
        }
      }
    },
    [onClose, showForm, deletingItemId]
  );

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // ── Form helpers ──
  const resetForm = () => {
    setFormDate(getTodayISO());
    setFormDescription("");
    setFormAmount("");
    setFormError(null);
    setEditingItem(null);
  };

  const handleToggleForm = () => {
    if (showForm) {
      resetForm();
    }
    setShowForm((prev) => !prev);
  };

  /** Populate the form with an existing item for editing. */
  const handleStartEdit = (item: LineItem) => {
    setEditingItem(item);
    setFormDate(extractDatePart(item.occurred_at));
    setFormDescription(item.description ?? "");
    setFormAmount(String(item.amount));
    setFormError(null);
    setShowForm(true);
    // Cancel any pending delete confirmation
    setDeletingItemId(null);
    setDeleteError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation: date required
    if (!formDate.trim()) {
      setFormError(t("ledger.dateRequired"));
      return;
    }

    // Validation: amount required and > 0
    const parsedAmount = parseFloat(formAmount);
    if (!formAmount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError(t("ledger.amountRequired"));
      return;
    }

    setFormSaving(true);

    try {
      if (isEditMode) {
        // Update existing item
        await updateLineItem({
          line_item_id: editingItem.line_item_id,
          occurred_at: `${formDate}T00:00:00`,
          amount: parsedAmount,
          description: formDescription.trim() || null,
          notes: editingItem.notes,
        });
      } else {
        // Create new item
        await createLineItem({
          budget_instance_category_id: ledgerState.budgetInstanceCategoryId,
          kind: ledgerState.kind,
          occurred_at: `${formDate}T00:00:00`,
          amount: parsedAmount,
          currency,
          description: formDescription.trim() || null,
          notes: null,
        });
      }

      // Reset form and re-fetch
      resetForm();
      setShowForm(false);
      await fetchItems();
      onDataChanged?.();
    } catch (err) {
      setFormError(formatErrorMessage(err, isEditMode ? t("ledger.failedToUpdate") : t("ledger.failedToSave")));
    } finally {
      setFormSaving(false);
    }
  };

  // ── Delete helpers ──
  const handleConfirmDelete = async (lineItemId: number) => {
    setDeleteError(null);
    try {
      await deleteLineItem(lineItemId);
      setDeletingItemId(null);
      await fetchItems();
      onDataChanged?.();
    } catch (err) {
      setDeleteError(formatErrorMessage(err, t("ledger.failedToDelete")));
    }
  };

  const handleCancelDelete = () => {
    setDeletingItemId(null);
    setDeleteError(null);
  };

  // Compute total
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("ledger.transactionsFor", { kind: kindLabel, category: categoryName })}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {categoryName}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {t("ledger.kindTransactions", { kind: kindLabel })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleForm}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                showForm
                  ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
              aria-label={showForm ? t("common.cancel") : t("ledger.addNew")}
            >
              {showForm ? t("common.cancel") : t("ledger.addButton")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={t("common.close")}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Entry / Edit form (collapsible) */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="px-6 py-4 border-b border-slate-700 bg-slate-800/50"
            aria-label={isEditMode ? t("ledger.editForm") : t("ledger.addForm")}
          >
            {isEditMode && (
              <p className="text-xs text-amber-400 mb-2">
                {t("ledger.editingTransaction", { id: editingItem.line_item_id })}
              </p>
            )}
            <div className="grid grid-cols-[1fr_2fr_1fr] gap-3 items-end">
              {/* Date */}
              <div>
                <label
                  htmlFor="txn-date"
                  className="block text-xs font-medium text-slate-400 mb-1"
                >
                  {t("ledger.date")} <span className="text-red-400">*</span>
                </label>
                <input
                  ref={dateInputRef}
                  id="txn-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  aria-required="true"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="txn-description"
                  className="block text-xs font-medium text-slate-400 mb-1"
                >
                  {t("ledger.description")}
                </label>
                <input
                  id="txn-description"
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t("ledger.descriptionPlaceholder")}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  aria-label={t("ledger.description")}
                />
              </div>

              {/* Amount */}
              <div>
                <label
                  htmlFor="txn-amount"
                  className="block text-xs font-medium text-slate-400 mb-1"
                >
                  {t("ledger.amount")} ({currency}) <span className="text-red-400">*</span>
                </label>
                <input
                  id="txn-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  aria-required="true"
                  aria-label={t("ledger.amount")}
                />
              </div>
            </div>

            {/* Form error */}
            {formError && (
              <p className="text-xs text-red-400 mt-2" role="alert">
                {formError}
              </p>
            )}

            {/* Submit */}
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={formSaving}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isEditMode
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
                aria-label={isEditMode ? t("ledger.updateTransaction") : t("ledger.saveTransaction")}
              >
                {formSaving
                  ? isEditMode
                    ? t("ledger.updating")
                    : t("ledger.saving")
                  : isEditMode
                    ? t("ledger.updateTransaction")
                    : t("ledger.saveTransaction")}
              </button>
            </div>
          </form>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-slate-400">
                {t("ledger.loadingTransactions")}
              </div>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-red-400">{error}</div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && lineItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <p className="text-sm">
                {t("ledger.noTransactionsYet", { kind: kindLabel.toLowerCase() })}
              </p>
              <p className="text-xs mt-1">
                {showForm
                  ? t("ledger.fillFormHint")
                  : t("ledger.clickAddHint")}
              </p>
            </div>
          )}

          {/* Delete error banner */}
          {deleteError && (
            <p className="text-xs text-red-400 mb-2" role="alert">
              {deleteError}
            </p>
          )}

          {/* Line items table */}
          {!loading && !error && lineItems.length > 0 && (
            <table className="w-full text-sm" aria-label={t("ledger.kindLineItems", { kind: kindLabel })}>
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700">
                  <th className="text-left py-2 pr-4 font-medium">{t("ledger.date")}</th>
                  <th className="text-left py-2 pr-4 font-medium">
                    {t("ledger.description")}
                  </th>
                  <th className="text-right py-2 pr-4 font-medium">{t("ledger.amount")}</th>
                  <th className="text-right py-2 font-medium w-20">{t("ledger.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => {
                  const time = formatTime(item.occurred_at);
                  const isDeleting = deletingItemId === item.line_item_id;
                  return (
                    <tr
                      key={item.line_item_id}
                      className={`border-b border-slate-700/50 transition-colors ${
                        isDeleting
                          ? "bg-red-900/20"
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                        <div>{formatDate(item.occurred_at)}</div>
                        {time && (
                          <div className="text-xs text-slate-500">{time}</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-200">
                        <div>
                          {item.description || (
                            <span className="text-slate-500 italic">
                              {t("ledger.noDescription")}
                            </span>
                          )}
                        </div>
                        {item.is_template_default && (
                          <span className="text-xs text-emerald-500/70">
                            {t("ledger.templateDefault")}
                          </span>
                        )}
                        {item.notes && (
                          <div
                            className="text-xs text-slate-500 mt-0.5 truncate max-w-xs"
                            title={item.notes}
                          >
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-slate-200 whitespace-nowrap tabular-nums">
                        {formatCurrency(item.amount, item.currency)}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {isDeleting ? (
                          /* Inline delete confirmation */
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-red-400 mr-1">{t("ledger.deleteConfirm")}</span>
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(item.line_item_id)}
                              className="px-2 py-0.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                              aria-label={t("ledger.confirmDelete")}
                            >
                              {t("common.yes")}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelDelete}
                              className="px-2 py-0.5 text-xs font-medium rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                              aria-label={t("ledger.cancelDelete")}
                            >
                              {t("common.no")}
                            </button>
                          </div>
                        ) : (
                          /* Normal action buttons */
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                              aria-label={t("ledger.editTransaction", { desc: item.description || t("ledger.noDescription") })}
                              title={t("ledger.edit")}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingItemId(item.line_item_id);
                                setDeleteError(null);
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                              aria-label={t("ledger.deleteTransaction", { desc: item.description || t("ledger.noDescription") })}
                              title={t("ledger.delete")}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Total row */}
              <tfoot>
                <tr className="border-t-2 border-slate-600 font-semibold">
                  <td
                    colSpan={3}
                    className="py-2.5 text-slate-300"
                  >
                    {t("ledger.total", { count: lineItems.length })}
                  </td>
                  <td className="py-2.5 text-right text-white whitespace-nowrap tabular-nums">
                    {formatCurrency(total, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryLedgerModal;

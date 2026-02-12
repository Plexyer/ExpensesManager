import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { DraggableProvided } from "@hello-pangea/dnd";
import type { TemplateCategory } from "../../../types/template.types";

interface TemplateCategoryItemProps {
  category: TemplateCategory;
  currency: string;
  provided: DraggableProvided;
  isDragging: boolean;
  onRemove: (templateCategoryId: number) => void;
  onUpdateAmount: (templateCategoryId: number, amount: number) => void;
}

const TemplateCategoryItem = ({
  category,
  currency,
  provided,
  isDragging,
  onRemove,
  onUpdateAmount,
}: TemplateCategoryItemProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /** Focus the input when entering edit mode. */
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(category.allocated_amount.toFixed(2));
    setIsEditing(true);
  };

  const handleSave = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateAmount(category.template_category_id, parsed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`flex items-center gap-2 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg transition-shadow ${
        isDragging ? "shadow-lg shadow-black/30 border-blue-500/50 bg-slate-700" : ""
      }`}
    >
      {/* Drag handle */}
      <div
        {...provided.dragHandleProps}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors"
        aria-label={t("templates.dragToReorder", { name: category.category_name })}
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8-16a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
        </svg>
      </div>

      {/* Category name */}
      <div className="flex-1 min-w-0">
        <span className="text-white truncate block">{category.category_name}</span>
      </div>

      {/* Amount display / edit */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-sm">{currency}</span>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-24 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm text-right font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={t("templates.editAmount")}
            />
            <button
              type="button"
              onClick={handleSave}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label={t("templates.saveAmount")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-300 transition-colors"
              aria-label={t("templates.cancelEdit")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <span className="text-emerald-400 font-mono tabular-nums text-sm">
              {currency} {category.allocated_amount.toFixed(2)}
            </span>

            {/* Edit button */}
            <button
              type="button"
              onClick={handleStartEdit}
              className="text-slate-400 hover:text-blue-400 transition-colors"
              aria-label={t("templates.editCategory", { name: category.category_name })}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(category.template_category_id)}
              className="text-slate-400 hover:text-red-400 transition-colors"
              aria-label={t("templates.removeCategoryFromTemplate", { name: category.category_name })}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TemplateCategoryItem;

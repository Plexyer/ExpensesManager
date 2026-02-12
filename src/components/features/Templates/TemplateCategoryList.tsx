import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { TemplateCategory } from "../../../types/template.types";
import TemplateCategoryItem from "./TemplateCategoryItem";

interface TemplateCategoryListProps {
  categories: TemplateCategory[];
  currency: string;
  onRemove: (templateCategoryId: number) => void;
  onUpdateAmount: (templateCategoryId: number, amount: number) => void;
  onReorder: (reorderedCategories: TemplateCategory[]) => void;
}

const TemplateCategoryList = ({
  categories,
  currency,
  onRemove,
  onUpdateAmount,
  onReorder,
}: TemplateCategoryListProps) => {
  const { t } = useTranslation();

  /** Handle drag end: compute the reordered array and notify the parent. */
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Dropped outside the list
      if (!result.destination) return;

      // No movement
      if (result.destination.index === result.source.index) return;

      const reordered = Array.from(categories);
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);

      onReorder(reordered);
    },
    [categories, onReorder]
  );

  if (categories.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-4">
        {t("templates.noCategoriesYet")}
      </p>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="template-categories">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-2"
          >
            {categories.map((tc, index) => (
              <Draggable
                key={tc.template_category_id}
                draggableId={String(tc.template_category_id)}
                index={index}
              >
                {(dragProvided, snapshot) => (
                  <TemplateCategoryItem
                    category={tc}
                    currency={currency}
                    provided={dragProvided}
                    isDragging={snapshot.isDragging}
                    onRemove={onRemove}
                    onUpdateAmount={onUpdateAmount}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default TemplateCategoryList;

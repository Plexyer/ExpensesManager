import React from "react";
import PeriodGridCell from "./PeriodGridCell";
import { COLUMN_CONFIG } from "./types";
import type { ColumnWidths, GridColumnId } from "./types";
import type { GridCategoryRow } from "../../../services/fileService";

interface PeriodGridRowProps {
  row: GridCategoryRow;
  rowIndex: number;
  columnWidths: ColumnWidths;
  selectedColumnId: GridColumnId | null;
  onCellSelect: (rowIndex: number, columnId: GridColumnId) => void;
}

const PeriodGridRow = React.memo(({
  row,
  rowIndex,
  columnWidths,
  selectedColumnId,
  onCellSelect,
}: PeriodGridRowProps) => {
  return (
    <tr className="hover:bg-slate-700/20 transition-colors">
      {COLUMN_CONFIG.map((col, colIndex) => (
        <PeriodGridCell
          key={col.id}
          columnConfig={col}
          colIndex={colIndex}
          row={row}
          columnWidths={columnWidths}
          isSelected={selectedColumnId === col.id}
          onSelect={() => onCellSelect(rowIndex, col.id)}
        />
      ))}
    </tr>
  );
});

PeriodGridRow.displayName = "PeriodGridRow";

export default PeriodGridRow;

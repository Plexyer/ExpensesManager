import React from "react";
import PeriodGridCell from "./PeriodGridCell";
import { COLUMN_CONFIG } from "./types";
import type { ColumnWidths } from "./types";
import type { GridCategoryRow } from "../../../services/fileService";

interface PeriodGridRowProps {
  row: GridCategoryRow;
  columnWidths: ColumnWidths;
}

const PeriodGridRow = React.memo(({ row, columnWidths }: PeriodGridRowProps) => {
  return (
    <tr className="hover:bg-slate-700/20 transition-colors">
      {COLUMN_CONFIG.map((col, colIndex) => (
        <PeriodGridCell
          key={col.id}
          columnConfig={col}
          colIndex={colIndex}
          row={row}
          columnWidths={columnWidths}
        />
      ))}
    </tr>
  );
});

PeriodGridRow.displayName = "PeriodGridRow";

export default PeriodGridRow;

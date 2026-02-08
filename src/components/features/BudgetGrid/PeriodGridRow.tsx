import React from "react";
import PeriodGridCell from "./PeriodGridCell";
import { COLUMN_CONFIG } from "./types";
import type { GridCategoryRow } from "../../../services/fileService";

interface PeriodGridRowProps {
  row: GridCategoryRow;
}

const PeriodGridRow = React.memo(({ row }: PeriodGridRowProps) => {
  return (
    <tr className="hover:bg-slate-700/20 transition-colors">
      {COLUMN_CONFIG.map((col, colIndex) => (
        <PeriodGridCell
          key={col.id}
          columnConfig={col}
          colIndex={colIndex}
          row={row}
        />
      ))}
    </tr>
  );
});

PeriodGridRow.displayName = "PeriodGridRow";

export default PeriodGridRow;

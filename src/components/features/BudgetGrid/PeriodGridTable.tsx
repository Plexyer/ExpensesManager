import PeriodGridHeader from "./PeriodGridHeader";
import PeriodGridBody from "./PeriodGridBody";
import type { GridCategoryRow } from "../../../services/fileService";

interface PeriodGridTableProps {
  rows: GridCategoryRow[];
}

const PeriodGridTable = ({ rows }: PeriodGridTableProps) => {
  return (
    <div className="overflow-auto max-h-[calc(100vh-14rem)] rounded-lg border border-slate-700">
      <table
        role="grid"
        aria-label="Budget categories"
        className="min-w-full border-collapse text-slate-200"
      >
        <PeriodGridHeader />
        <PeriodGridBody rows={rows} />
      </table>
    </div>
  );
};

export default PeriodGridTable;

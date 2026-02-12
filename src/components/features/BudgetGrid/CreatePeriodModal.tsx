import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { createPeriod } from "../../../store/slices/budgetSlice";
import { fetchTemplates } from "../../../store/slices/templateSlice";

interface CreatePeriodModalProps {
  isOpen: boolean;
  /** Called when the modal closes. `created` is true if a period was successfully created. */
  onClose: (created?: boolean) => void;
}

/** Get today's date as YYYY-MM-DD string. */
const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const CreatePeriodModal = ({ isOpen, onClose }: CreatePeriodModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { templates } = useAppSelector((state) => state.templates);
  const { isCreatingPeriod, periodsError } = useAppSelector(
    (state) => state.budget
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchTemplates());
      setSelectedTemplateId("");
      setStartDate(getTodayString());
      setEndDate("");
      setLocalError(null);
    }
  }, [isOpen, dispatch]);

  // Show/close the native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Find the selected template to check cadence
  const selectedTemplate = templates.find(
    (t) => t.template_id === selectedTemplateId
  );
  const isCustomCadence = selectedTemplate?.cadence === "custom";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (selectedTemplateId === "") {
      setLocalError(t("periods.selectTemplateRequired"));
      return;
    }
    if (!startDate) {
      setLocalError(t("periods.selectStartDate"));
      return;
    }
    if (isCustomCadence && !endDate) {
      setLocalError(t("periods.endDateRequired"));
      return;
    }

    try {
      await dispatch(
        createPeriod({
          template_id: selectedTemplateId as number,
          start_date: startDate,
          end_date: isCustomCadence ? endDate : null,
        })
      ).unwrap();
      onClose(true);
    } catch {
      // Error is handled by periodsError in Redux; also show locally
      setLocalError(periodsError ?? t("periods.failedToCreatePeriod"));
    }
  };

  const handleDialogClose = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Close when clicking the backdrop (outside the inner container)
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const displayError = localError || periodsError;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      className="backdrop:bg-black/60 bg-transparent p-0 m-auto"
      aria-label={t("periods.createBudgetPeriod")}
    >
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {t("periods.createBudgetPeriod")}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Template Selector */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-period-template"
              className="text-sm font-medium text-slate-300"
            >
              {t("periods.template")} *
            </label>
            <select
              id="create-period-template"
              value={selectedTemplateId}
              onChange={(e) =>
                setSelectedTemplateId(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
              aria-label={t("periods.selectTemplateForPeriod")}
            >
              <option value="">{t("periods.selectTemplate")}</option>
              {templates.map((template) => (
                <option key={template.template_id} value={template.template_id}>
                  {template.name} ({template.cadence}, {template.default_currency})
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-amber-400">
                {t("periods.noTemplatesFound")}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-period-start"
              className="text-sm font-medium text-slate-300"
            >
              {t("periods.startDate")} *
            </label>
            <input
              id="create-period-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
              aria-label={t("periods.periodStartDate")}
            />
          </div>

          {/* End Date (only for custom cadence) */}
          {isCustomCadence && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="create-period-end"
                className="text-sm font-medium text-slate-300"
              >
                {t("periods.endDate")} *
              </label>
              <input
                id="create-period-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
                aria-label={t("periods.periodEndDate")}
              />
            </div>
          )}

          {/* Template Info */}
          {selectedTemplate && (
            <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-3">
              <p className="text-xs text-slate-400">
                {t("periods.cadence")}:{" "}
                <span className="text-slate-200">
                  {selectedTemplate.cadence.charAt(0).toUpperCase() +
                    selectedTemplate.cadence.slice(1)}
                </span>
                {" · "}{t("periods.currency")}:{" "}
                <span className="text-slate-200">
                  {selectedTemplate.default_currency}
                </span>
              </p>
              {!isCustomCadence && (
                <p className="text-xs text-slate-500 mt-1">
                  {t("periods.endDateAutoCalculated")}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {displayError && (
            <p className="text-sm text-red-400" role="alert">
              {displayError}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => onClose()}
              disabled={isCreatingPeriod}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              aria-label={t("common.cancel")}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={
                isCreatingPeriod ||
                selectedTemplateId === "" ||
                templates.length === 0
              }
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t("periods.createPeriod")}
            >
              {isCreatingPeriod ? t("periods.creating") : t("periods.createPeriod")}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

export default CreatePeriodModal;

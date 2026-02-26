import { useTranslation } from "react-i18next";

type DashboardWidgetState = "loading" | "empty" | "error";

interface DashboardStateViewProps {
  state: DashboardWidgetState;
}

const DashboardStateViews = ({ state }: DashboardStateViewProps) => {
  const { t } = useTranslation();

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-300" role="status" aria-live="polite">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
        <span>{t("dashboard.widgetStateLoading", { defaultValue: "Loading widget data..." })}</span>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <p className="text-sm text-slate-400">
        {t("dashboard.widgetStateEmpty", {
          defaultValue: "No data to display yet for this widget.",
        })}
      </p>
    );
  }

  return (
    <p className="text-sm text-red-300">
      {t("dashboard.widgetStateError", {
        defaultValue: "Widget data could not be loaded.",
      })}
    </p>
  );
};

export default DashboardStateViews;


import { useTranslation } from "react-i18next";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { dashboardWidgetRegistry } from "./widgetRegistry";

const DashboardShell = () => {
  const { t } = useTranslation();

  return (
    <section
      className="mx-auto w-full max-w-6xl"
      aria-labelledby="dashboard-shell-title"
      aria-describedby="dashboard-shell-description"
    >
      <header className="mb-5">
        <h2 id="dashboard-shell-title" className="text-xl font-semibold text-white">
          {t("dashboard.title")}
        </h2>
        <p id="dashboard-shell-description" className="mt-1 text-sm text-slate-400">
          {t("dashboard.shellDescription", {
            defaultValue: "Widget-based dashboard foundation. Business widgets are added in upcoming tasks.",
          })}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" role="list" aria-label={t("dashboard.widgetsRegion", { defaultValue: "Dashboard widgets" })}>
        {dashboardWidgetRegistry.map((widget) => (
          <div
            key={widget.id}
            className={widget.span === "double" ? "xl:col-span-2" : ""}
            role="listitem"
          >
            <DashboardWidgetCard widget={widget} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default DashboardShell;


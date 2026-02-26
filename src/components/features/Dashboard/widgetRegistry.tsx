import DashboardStateViews from "./DashboardStateViews";
import type { DashboardWidgetDefinition } from "./types";
import CurrentPeriodKpiWidget from "./CurrentPeriodKpiWidget";
import OverspentCategoriesWidget from "./OverspentCategoriesWidget";

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  {
    id: "current-period-overview",
    titleKey: "dashboard.widgetCurrentPeriodTitle",
    descriptionKey: "dashboard.widgetCurrentPeriodDesc",
    span: "single",
    render: () => <CurrentPeriodKpiWidget />,
  },
  {
    id: "spending-trend",
    titleKey: "dashboard.widgetTrendTitle",
    descriptionKey: "dashboard.widgetTrendDesc",
    span: "single",
    render: () => <DashboardStateViews state="empty" />,
  },
  {
    id: "alerts",
    titleKey: "dashboard.widgetOverspentTitle",
    descriptionKey: "dashboard.widgetOverspentDesc",
    span: "double",
    render: () => <OverspentCategoriesWidget />,
  },
];


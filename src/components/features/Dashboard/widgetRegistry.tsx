import DashboardStateViews from "./DashboardStateViews";
import type { DashboardWidgetDefinition } from "./types";
import CurrentPeriodKpiWidget from "./CurrentPeriodKpiWidget";
import OverspentCategoriesWidget from "./OverspentCategoriesWidget";
import RecentPeriodsWidget from "./RecentPeriodsWidget";
import InactiveCategoriesWidget from "./InactiveCategoriesWidget";
import CategoryBreakdownWidget from "./CategoryBreakdownWidget";
import CrossPeriodTrendWidget from "./CrossPeriodTrendWidget";

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  {
    id: "current-period-overview",
    titleKey: "dashboard.widgetCurrentPeriodTitle",
    descriptionKey: "dashboard.widgetCurrentPeriodDesc",
    span: "single",
    render: () => <CurrentPeriodKpiWidget />,
  },
  {
    id: "recent-periods",
    titleKey: "dashboard.widgetRecentPeriodsTitle",
    descriptionKey: "dashboard.widgetRecentPeriodsDesc",
    span: "single",
    render: () => <RecentPeriodsWidget />,
  },
  {
    id: "alerts",
    titleKey: "dashboard.widgetOverspentTitle",
    descriptionKey: "dashboard.widgetOverspentDesc",
    span: "double",
    render: () => <OverspentCategoriesWidget />,
  },
  {
    id: "inactive-categories",
    titleKey: "dashboard.widgetInactiveCategoriesTitle",
    descriptionKey: "dashboard.widgetInactiveCategoriesDesc",
    span: "single",
    render: () => <InactiveCategoriesWidget />,
  },
  {
    id: "category-breakdown",
    titleKey: "dashboard.widgetCategoryBreakdownTitle",
    descriptionKey: "dashboard.widgetCategoryBreakdownDesc",
    span: "double",
    render: () => <CategoryBreakdownWidget />,
  },
  {
    id: "cross-period-trend",
    titleKey: "dashboard.widgetCrossPeriodTrendTitle",
    descriptionKey: "dashboard.widgetCrossPeriodTrendDesc",
    span: "double",
    render: () => <CrossPeriodTrendWidget />,
  },
];


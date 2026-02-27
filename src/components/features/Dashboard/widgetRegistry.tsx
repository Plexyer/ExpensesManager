import DashboardStateViews from "./DashboardStateViews";
import type { DashboardWidgetDefinition } from "./types";
import CurrentPeriodKpiWidget from "./CurrentPeriodKpiWidget";
import OverspentCategoriesWidget from "./OverspentCategoriesWidget";
import RecentPeriodsWidget from "./RecentPeriodsWidget";
import InactiveCategoriesWidget from "./InactiveCategoriesWidget";
import CategoryBreakdownWidget from "./CategoryBreakdownWidget";
import CrossPeriodTrendWidget from "./CrossPeriodTrendWidget";
import AllocationVsActualWidget from "./AllocationVsActualWidget";
import LargestChangesVsPreviousPeriodWidget from "./LargestChangesVsPreviousPeriodWidget";
import AttachmentCoverageWidget from "./AttachmentCoverageWidget";

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  {
    id: "current-period-overview",
    titleKey: "dashboard.widgetCurrentPeriodTitle",
    descriptionKey: "dashboard.widgetCurrentPeriodDesc",
    span: "single",
    loadingPriority: "critical",
    render: () => <CurrentPeriodKpiWidget />,
  },
  {
    id: "recent-periods",
    titleKey: "dashboard.widgetRecentPeriodsTitle",
    descriptionKey: "dashboard.widgetRecentPeriodsDesc",
    span: "single",
    loadingPriority: "critical",
    render: () => <RecentPeriodsWidget />,
  },
  {
    id: "alerts",
    titleKey: "dashboard.widgetOverspentTitle",
    descriptionKey: "dashboard.widgetOverspentDesc",
    span: "double",
    loadingPriority: "critical",
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
  {
    id: "allocation-vs-actual",
    titleKey: "dashboard.widgetAllocationVsActualTitle",
    descriptionKey: "dashboard.widgetAllocationVsActualDesc",
    span: "double",
    render: () => <AllocationVsActualWidget />,
  },
  {
    id: "largest-changes-previous-period",
    titleKey: "dashboard.widgetLargestChangesTitle",
    descriptionKey: "dashboard.widgetLargestChangesDesc",
    span: "double",
    render: () => <LargestChangesVsPreviousPeriodWidget />,
  },
  {
    id: "attachment-coverage",
    titleKey: "dashboard.widgetAttachmentCoverageTitle",
    descriptionKey: "dashboard.widgetAttachmentCoverageDesc",
    span: "single",
    render: () => <AttachmentCoverageWidget />,
  },
];


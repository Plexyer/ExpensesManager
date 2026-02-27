import type { ReactNode } from "react";

export type DashboardWidgetSpan = "single" | "double";
export type DashboardWidgetLoadingPriority = "critical" | "deferred";

export interface DashboardWidgetDefinition {
  id: string;
  titleKey: string;
  descriptionKey?: string;
  span: DashboardWidgetSpan;
  loadingPriority?: DashboardWidgetLoadingPriority;
  render: () => ReactNode;
}


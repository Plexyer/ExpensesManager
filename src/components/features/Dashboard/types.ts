import type { ReactNode } from "react";

export type DashboardWidgetSpan = "single" | "double";

export interface DashboardWidgetDefinition {
  id: string;
  titleKey: string;
  descriptionKey?: string;
  span: DashboardWidgetSpan;
  render: () => ReactNode;
}


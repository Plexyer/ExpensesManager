import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import DashboardShell from "../DashboardShell";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { dashboardWidgetRegistry } from "../widgetRegistry";

vi.mock("../CurrentPeriodKpiWidget", () => ({
  default: () => <div>KPI Widget</div>,
}));

vi.mock("../OverspentCategoriesWidget", () => ({
  default: () => <div>Overspent Widget</div>,
}));

vi.mock("../RecentPeriodsWidget", () => ({
  default: () => <div>Recent Periods Widget</div>,
}));

vi.mock("../InactiveCategoriesWidget", () => ({
  default: () => <div>Inactive Categories Widget</div>,
}));

describe("DashboardShell", () => {
  it("renders dashboard shell heading and description", () => {
    renderWithProviders(<DashboardShell />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.getByText(/Widget-based dashboard foundation/i)
    ).toBeInTheDocument();
  });

  it("renders all widgets from registry", () => {
    renderWithProviders(<DashboardShell />);

    const renderedCards = screen.getAllByRole("article");
    expect(renderedCards).toHaveLength(dashboardWidgetRegistry.length);
  });

  it("renders placeholder widget states and registered widgets", () => {
    renderWithProviders(<DashboardShell />);

    expect(screen.getByText("KPI Widget")).toBeInTheDocument();
    expect(screen.getByText("Recent Periods Widget")).toBeInTheDocument();
    expect(screen.getByText("Overspent Widget")).toBeInTheDocument();
    expect(screen.getByText("Inactive Categories Widget")).toBeInTheDocument();
  });
});


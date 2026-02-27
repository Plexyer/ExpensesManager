import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardShell from "../DashboardShell";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { dashboardWidgetRegistry } from "../widgetRegistry";

const mockGetUiSetting = vi.hoisted(() => vi.fn());
const mockSetUiSetting = vi.hoisted(() => vi.fn());

vi.mock("../../../../services/settingsService", () => ({
  getUiSetting: mockGetUiSetting,
  setUiSetting: mockSetUiSetting,
}));

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

vi.mock("../CategoryBreakdownWidget", () => ({
  default: () => <div>Category Breakdown Widget</div>,
}));

describe("DashboardShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUiSetting.mockResolvedValue(null);
    mockSetUiSetting.mockResolvedValue(undefined);
  });

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
    expect(screen.getByText("Category Breakdown Widget")).toBeInTheDocument();
  });

  it("supports remove, add and reset widget controls", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardShell />);

    await user.click(
      screen.getByRole("button", {
        name: /remove current period overview widget/i,
      })
    );

    expect(screen.queryByText("KPI Widget")).not.toBeInTheDocument();

    const addWidgetSelect = screen.getByRole("combobox", {
      name: /add widget/i,
    });
    await user.selectOptions(addWidgetSelect, "current-period-overview");
    await user.click(screen.getByRole("button", { name: /add widget/i }));

    expect(screen.getByText("KPI Widget")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset to default/i }));
    expect(screen.getByText("KPI Widget")).toBeInTheDocument();
    expect(mockSetUiSetting).toHaveBeenCalled();
  });

  it("supports keyboard reorder controls and persists custom order", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardShell />);

    await user.click(
      screen.getByRole("button", {
        name: /move current period overview widget down/i,
      })
    );

    const renderedCards = screen.getAllByRole("article");
    const firstWidgetTitle = within(renderedCards[0]).getByRole("heading", {
      level: 3,
    });
    expect(firstWidgetTitle).toHaveTextContent("Recent Periods");
    expect(mockSetUiSetting).toHaveBeenCalledWith(
      "dashboard_selected_widget_ids",
      JSON.stringify([
        "recent-periods",
        "current-period-overview",
        "alerts",
        "inactive-categories",
        "category-breakdown",
      ])
    );
  });
});


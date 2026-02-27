import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPreferencesSettings from "../DashboardPreferencesSettings";
import { renderWithProviders } from "../../../../test/renderWithProviders";

const mockLoadDashboardWidgetIds = vi.hoisted(() => vi.fn());
const mockSaveDashboardWidgetIds = vi.hoisted(() => vi.fn());

vi.mock("../../Dashboard/dashboardWidgetSettings", () => ({
  loadDashboardWidgetIds: mockLoadDashboardWidgetIds,
  saveDashboardWidgetIds: mockSaveDashboardWidgetIds,
}));

vi.mock("../../Dashboard/widgetRegistry", () => ({
  dashboardWidgetRegistry: [
    {
      id: "current-period-overview",
      titleKey: "dashboard.widgetCurrentPeriodTitle",
      descriptionKey: "dashboard.widgetCurrentPeriodDesc",
      span: "single",
      render: () => null,
    },
    {
      id: "recent-periods",
      titleKey: "dashboard.widgetRecentPeriodsTitle",
      descriptionKey: "dashboard.widgetRecentPeriodsDesc",
      span: "single",
      render: () => null,
    },
  ],
}));

describe("DashboardPreferencesSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadDashboardWidgetIds.mockResolvedValue([
      "current-period-overview",
      "recent-periods",
    ]);
    mockSaveDashboardWidgetIds.mockResolvedValue(undefined);
  });

  it("renders dashboard preferences section", async () => {
    renderWithProviders(<DashboardPreferencesSettings />);

    expect(
      screen.getByRole("heading", { name: /dashboard preferences/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/manage widget visibility and layout order/i)
    ).toBeInTheDocument();
  });

  it("loads persisted widget ids", async () => {
    mockLoadDashboardWidgetIds.mockResolvedValue(["recent-periods"]);

    renderWithProviders(<DashboardPreferencesSettings />);

    const switches = await screen.findAllByRole("switch");
    expect(switches[0]).toHaveAttribute("aria-checked", "false");
    expect(switches[1]).toHaveAttribute("aria-checked", "true");
  });

  it("toggles widget visibility and persists state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPreferencesSettings />);

    const switches = await screen.findAllByRole("switch");
    await user.click(switches[0]);

    expect(mockSaveDashboardWidgetIds).toHaveBeenCalledWith(["recent-periods"]);
  });

  it("resets widget selection to defaults", async () => {
    const user = userEvent.setup();
    mockLoadDashboardWidgetIds.mockResolvedValue(["recent-periods"]);
    renderWithProviders(<DashboardPreferencesSettings />);

    await user.click(await screen.findByRole("button", { name: /reset to default/i }));
    expect(mockSaveDashboardWidgetIds).toHaveBeenCalledWith([
      "current-period-overview",
      "recent-periods",
    ]);
  });

  it("supports moving active widget order and persists", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPreferencesSettings />);

    const moveDownButtons = await screen.findAllByRole("button", { name: /move down/i });
    await user.click(moveDownButtons[0]);

    expect(mockSaveDashboardWidgetIds).toHaveBeenCalledWith([
      "recent-periods",
      "current-period-overview",
    ]);
  });

  it("shows save error when persistence fails", async () => {
    const user = userEvent.setup();
    mockSaveDashboardWidgetIds.mockRejectedValueOnce(new Error("save failed"));
    renderWithProviders(<DashboardPreferencesSettings />);

    const switches = await screen.findAllByRole("switch");
    await user.click(switches[0]);

    expect(
      await screen.findByText(/could not save dashboard preferences/i)
    ).toBeInTheDocument();
  });

  it("shows load error when loading fails", async () => {
    mockLoadDashboardWidgetIds.mockRejectedValueOnce(new Error("load failed"));
    renderWithProviders(<DashboardPreferencesSettings />);

    expect(
      await screen.findByText(/could not load dashboard preferences/i)
    ).toBeInTheDocument();
  });
});

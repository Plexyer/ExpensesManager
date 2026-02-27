import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import CrossPeriodTrendWidget from "../CrossPeriodTrendWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";

const mockUseAppSelector = vi.hoisted(() => vi.fn());
const mockListPeriods = vi.hoisted(() => vi.fn());
const mockListDashboardTimeSeries = vi.hoisted(() => vi.fn());

vi.mock("../../../../store/hooks", () => ({
  useAppSelector: mockUseAppSelector,
}));

vi.mock("../../../../services/periodService", () => ({
  listPeriods: mockListPeriods,
}));

vi.mock("../../../../services/lineItemService", () => ({
  listDashboardTimeSeries: mockListDashboardTimeSeries,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  LineChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Line: () => <div data-testid="line" />,
}));

describe("CrossPeriodTrendWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
      })
    );
  });

  it("renders loading state", () => {
    mockListPeriods.mockReturnValue(new Promise(() => {}));
    mockListDashboardTimeSeries.mockResolvedValue([]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders error state when period loading fails", async () => {
    mockListPeriods.mockRejectedValue(new Error("boom"));
    mockListDashboardTimeSeries.mockResolvedValue([]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders empty state when no periods exist", async () => {
    mockListPeriods.mockResolvedValue([]);
    mockListDashboardTimeSeries.mockResolvedValue([]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByText(/no data to display yet/i)).toBeInTheDocument();
  });

  it("renders insufficient-data state when only one period is available", async () => {
    mockListPeriods.mockResolvedValue([
      {
        budget_instance_id: 1,
        cadence: "monthly",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        template_id: 1,
        template_name: "January",
        income_arrival_date: null,
        created_at: "2026-01-01",
      },
    ]);
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "period:1",
        bucket_label: "January",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-31",
        received_total: 100,
        spent_total: 60,
        net_total: 40,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(
      await screen.findByText(/at least two periods are required/i)
    ).toBeInTheDocument();
  });

  it("renders chart for two or more periods", async () => {
    mockListPeriods.mockResolvedValue([
      {
        budget_instance_id: 3,
        cadence: "monthly",
        start_date: "2026-03-01",
        end_date: "2026-03-31",
        template_id: 1,
        template_name: "March",
        income_arrival_date: null,
        created_at: "2026-03-01",
      },
      {
        budget_instance_id: 2,
        cadence: "monthly",
        start_date: "2026-02-01",
        end_date: "2026-02-28",
        template_id: 1,
        template_name: "February",
        income_arrival_date: null,
        created_at: "2026-02-01",
      },
    ]);
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "period:2",
        bucket_label: "February",
        bucket_start_date: "2026-02-01",
        bucket_end_date: "2026-02-28",
        received_total: 1002,
        spent_total: 452,
        net_total: 550,
        currency: "CHF",
      },
      {
        bucket_key: "period:3",
        bucket_label: "March",
        bucket_start_date: "2026-03-01",
        bucket_end_date: "2026-03-31",
        received_total: 1003,
        spent_total: 453,
        net_total: 550,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByText(/showing 2 of 2 periods/i)).toBeInTheDocument();
  });

  it("loads all periods when the default scope is set to all", async () => {
    mockListPeriods.mockResolvedValue([
      {
        budget_instance_id: 4,
        cadence: "monthly",
        start_date: "2026-04-01",
        end_date: "2026-04-30",
        template_id: 1,
        template_name: "April",
        income_arrival_date: null,
        created_at: "2026-04-01",
      },
      {
        budget_instance_id: 3,
        cadence: "monthly",
        start_date: "2026-03-01",
        end_date: "2026-03-31",
        template_id: 1,
        template_name: "March",
        income_arrival_date: null,
        created_at: "2026-03-01",
      },
      {
        budget_instance_id: 2,
        cadence: "monthly",
        start_date: "2026-02-01",
        end_date: "2026-02-28",
        template_id: 1,
        template_name: "February",
        income_arrival_date: null,
        created_at: "2026-02-01",
      },
      {
        budget_instance_id: 1,
        cadence: "monthly",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        template_id: 1,
        template_name: "January",
        income_arrival_date: null,
        created_at: "2026-01-01",
      },
    ]);
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "period:1",
        bucket_label: "January",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-31",
        received_total: 101,
        spent_total: 51,
        net_total: 50,
        currency: "CHF",
      },
      {
        bucket_key: "period:2",
        bucket_label: "February",
        bucket_start_date: "2026-02-01",
        bucket_end_date: "2026-02-28",
        received_total: 102,
        spent_total: 52,
        net_total: 50,
        currency: "CHF",
      },
      {
        bucket_key: "period:3",
        bucket_label: "March",
        bucket_start_date: "2026-03-01",
        bucket_end_date: "2026-03-31",
        received_total: 103,
        spent_total: 53,
        net_total: 50,
        currency: "CHF",
      },
      {
        bucket_key: "period:4",
        bucket_label: "April",
        bucket_start_date: "2026-04-01",
        bucket_end_date: "2026-04-30",
        received_total: 104,
        spent_total: 54,
        net_total: 50,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();

    expect(mockListDashboardTimeSeries).toHaveBeenCalledTimes(1);
    expect(mockListDashboardTimeSeries).toHaveBeenCalledWith({
      granularity: "period",
      limit: undefined,
    });
    expect(screen.getByText(/showing 4 of 4 periods/i)).toBeInTheDocument();
  });

  it("reloads trend data when period count changes", async () => {
    const user = userEvent.setup();
    mockListPeriods.mockResolvedValue([
      {
        budget_instance_id: 3,
        cadence: "monthly",
        start_date: "2026-03-01",
        end_date: "2026-03-31",
        template_id: 1,
        template_name: "March",
        income_arrival_date: null,
        created_at: "2026-03-01",
      },
      {
        budget_instance_id: 2,
        cadence: "monthly",
        start_date: "2026-02-01",
        end_date: "2026-02-28",
        template_id: 1,
        template_name: "February",
        income_arrival_date: null,
        created_at: "2026-02-01",
      },
      {
        budget_instance_id: 1,
        cadence: "monthly",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        template_id: 1,
        template_name: "January",
        income_arrival_date: null,
        created_at: "2026-01-01",
      },
    ]);
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "period:1",
        bucket_label: "January",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-31",
        received_total: 200,
        spent_total: 80,
        net_total: 120,
        currency: "CHF",
      },
      {
        bucket_key: "period:2",
        bucket_label: "February",
        bucket_start_date: "2026-02-01",
        bucket_end_date: "2026-02-28",
        received_total: 220,
        spent_total: 90,
        net_total: 130,
        currency: "CHF",
      },
      {
        bucket_key: "period:3",
        bucket_label: "March",
        bucket_start_date: "2026-03-01",
        bucket_end_date: "2026-03-31",
        received_total: 240,
        spent_total: 95,
        net_total: 145,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    await screen.findByTestId("line-chart");

    const periodCountSelect = screen.getByRole("combobox", {
      name: /periods to show/i,
    });
    await user.selectOptions(periodCountSelect, "3");

    expect(mockListPeriods).toHaveBeenCalledTimes(2);
    expect(mockListDashboardTimeSeries).toHaveBeenCalledTimes(2);
    expect(mockListDashboardTimeSeries).toHaveBeenLastCalledWith({
      granularity: "period",
      limit: 3,
    });
  });
});

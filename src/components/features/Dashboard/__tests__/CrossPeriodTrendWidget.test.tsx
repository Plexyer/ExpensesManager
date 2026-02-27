import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import CrossPeriodTrendWidget from "../CrossPeriodTrendWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";

const mockUseAppSelector = vi.hoisted(() => vi.fn());
const mockListDashboardTimeSeries = vi.hoisted(() => vi.fn());

vi.mock("../../../../store/hooks", () => ({
  useAppSelector: mockUseAppSelector,
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
    mockListDashboardTimeSeries.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders error state when aggregate loading fails", async () => {
    mockListDashboardTimeSeries.mockRejectedValue(new Error("boom"));

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders empty state when no timeline buckets exist", async () => {
    mockListDashboardTimeSeries.mockResolvedValue([]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByText(/no data to display yet/i)).toBeInTheDocument();
  });

  it("renders insufficient-data state when only one bucket is available", async () => {
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "2026-01-01",
        bucket_label: "2026-01-01",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-01",
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

  it("renders chart for two or more timeline buckets", async () => {
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "2026-02-01",
        bucket_label: "February",
        bucket_start_date: "2026-02-01",
        bucket_end_date: "2026-02-01",
        received_total: 1002,
        spent_total: 452,
        net_total: 550,
        currency: "CHF",
      },
      {
        bucket_key: "2026-03-01",
        bucket_label: "March",
        bucket_start_date: "2026-03-01",
        bucket_end_date: "2026-03-01",
        received_total: 1003,
        spent_total: 453,
        net_total: 550,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
    expect(
      screen.getByText(/showing 2 of 2 timeline buckets/i)
    ).toBeInTheDocument();
  });

  it("uses weekly all-history defaults on first load", async () => {
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "2026-01-01",
        bucket_label: "2026-01-01",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-01",
        received_total: 101,
        spent_total: 51,
        net_total: 50,
        currency: "CHF",
      },
      {
        bucket_key: "2026-02-01",
        bucket_label: "2026-02-01",
        bucket_start_date: "2026-02-01",
        bucket_end_date: "2026-02-01",
        received_total: 102,
        spent_total: 52,
        net_total: 50,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();

    expect(mockListDashboardTimeSeries).toHaveBeenCalledTimes(1);
    expect(mockListDashboardTimeSeries).toHaveBeenCalledWith({
      granularity: "weekly",
      limit: 104,
      start_date: undefined,
      end_date: undefined,
    });
  });

  it("reloads trend data when granularity changes", async () => {
    const user = userEvent.setup();
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "2026-01-01",
        bucket_label: "January",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-01",
        received_total: 200,
        spent_total: 80,
        net_total: 120,
        currency: "CHF",
      },
      {
        bucket_key: "2026-02-01",
        bucket_label: "February",
        bucket_start_date: "2026-02-01",
        bucket_end_date: "2026-02-01",
        received_total: 220,
        spent_total: 90,
        net_total: 130,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    await screen.findByTestId("line-chart");

    const granularitySelect = screen.getByRole("combobox", {
      name: /granularity/i,
    });
    await user.selectOptions(granularitySelect, "daily");

    expect(mockListDashboardTimeSeries).toHaveBeenCalledTimes(2);
    expect(mockListDashboardTimeSeries).toHaveBeenLastCalledWith({
      granularity: "daily",
      limit: 180,
      start_date: undefined,
      end_date: undefined,
    });
  });

  it("passes date range when timeframe is changed from all history", async () => {
    const user = userEvent.setup();
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "2026-01-01",
        bucket_label: "2026-01-01",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-01",
        received_total: 200,
        spent_total: 80,
        net_total: 120,
        currency: "CHF",
      },
      {
        bucket_key: "2026-01-02",
        bucket_label: "2026-01-02",
        bucket_start_date: "2026-01-02",
        bucket_end_date: "2026-01-02",
        received_total: 220,
        spent_total: 90,
        net_total: 130,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<CrossPeriodTrendWidget />);
    await screen.findByTestId("line-chart");

    const timeframeSelect = screen.getByRole("combobox", {
      name: /timeframe/i,
    });
    await user.selectOptions(timeframeSelect, "30d");

    expect(mockListDashboardTimeSeries).toHaveBeenCalledTimes(2);
    expect(mockListDashboardTimeSeries).toHaveBeenLastCalledWith({
      granularity: "weekly",
      limit: 104,
      start_date: expect.any(String),
      end_date: expect.any(String),
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForecastRunwayInsightsWidget from "../ForecastRunwayInsightsWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";

const mockListDashboardTimeSeries = vi.hoisted(() => vi.fn());

vi.mock("../../../../services/lineItemService", () => ({
  listDashboardTimeSeries: mockListDashboardTimeSeries,
}));

describe("ForecastRunwayInsightsWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    mockListDashboardTimeSeries.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ForecastRunwayInsightsWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders error state when aggregate loading fails", async () => {
    mockListDashboardTimeSeries.mockRejectedValue(new Error("boom"));

    renderWithProviders(<ForecastRunwayInsightsWidget />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders empty state when no buckets are returned", async () => {
    mockListDashboardTimeSeries.mockResolvedValue([]);

    renderWithProviders(<ForecastRunwayInsightsWidget />);
    expect(await screen.findByText(/no data to display yet/i)).toBeInTheDocument();
  });

  it("renders insufficient-data warning for sparse datasets", async () => {
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "2026-01-01",
        bucket_label: "2026-01-01",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-07",
        received_total: 300,
        spent_total: 200,
        net_total: 100,
        currency: "CHF",
      },
      {
        bucket_key: "2026-01-08",
        bucket_label: "2026-01-08",
        bucket_start_date: "2026-01-08",
        bucket_end_date: "2026-01-14",
        received_total: 200,
        spent_total: 300,
        net_total: -100,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<ForecastRunwayInsightsWidget />);
    expect(await screen.findByText(/too sparse for a reliable projection/i)).toBeInTheDocument();
  });

  it("renders deterministic forecast summary and assumptions", async () => {
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "w1",
        bucket_label: "W1",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-07",
        received_total: 400,
        spent_total: 500,
        net_total: -100,
        currency: "CHF",
      },
      {
        bucket_key: "w2",
        bucket_label: "W2",
        bucket_start_date: "2026-01-08",
        bucket_end_date: "2026-01-14",
        received_total: 400,
        spent_total: 500,
        net_total: -100,
        currency: "CHF",
      },
      {
        bucket_key: "w3",
        bucket_label: "W3",
        bucket_start_date: "2026-01-15",
        bucket_end_date: "2026-01-21",
        received_total: 400,
        spent_total: 500,
        net_total: -100,
        currency: "CHF",
      },
      {
        bucket_key: "w4",
        bucket_label: "W4",
        bucket_start_date: "2026-01-22",
        bucket_end_date: "2026-01-28",
        received_total: 400,
        spent_total: 500,
        net_total: -100,
        currency: "CHF",
      },
      {
        bucket_key: "w5",
        bucket_label: "W5",
        bucket_start_date: "2026-01-29",
        bucket_end_date: "2026-02-04",
        received_total: 400,
        spent_total: 500,
        net_total: -100,
        currency: "CHF",
      },
      {
        bucket_key: "w6",
        bucket_label: "W6",
        bucket_start_date: "2026-02-05",
        bucket_end_date: "2026-02-11",
        received_total: 400,
        spent_total: 500,
        net_total: -100,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<ForecastRunwayInsightsWidget />);

    expect(await screen.findByText(/watch closely/i)).toBeInTheDocument();
    expect(screen.getByText(/confidence: medium/i)).toBeInTheDocument();
    expect(screen.getByText(/average net/i)).toBeInTheDocument();
    expect(screen.getByText(/forecast assumptions/i)).toBeInTheDocument();
  });

  it("reloads with updated args when controls change", async () => {
    const user = userEvent.setup();
    mockListDashboardTimeSeries.mockResolvedValue([
      {
        bucket_key: "w1",
        bucket_label: "W1",
        bucket_start_date: "2026-01-01",
        bucket_end_date: "2026-01-07",
        received_total: 400,
        spent_total: 500,
        net_total: -100,
        currency: "CHF",
      },
      {
        bucket_key: "w2",
        bucket_label: "W2",
        bucket_start_date: "2026-01-08",
        bucket_end_date: "2026-01-14",
        received_total: 450,
        spent_total: 500,
        net_total: -50,
        currency: "CHF",
      },
      {
        bucket_key: "w3",
        bucket_label: "W3",
        bucket_start_date: "2026-01-15",
        bucket_end_date: "2026-01-21",
        received_total: 500,
        spent_total: 500,
        net_total: 0,
        currency: "CHF",
      },
    ]);

    renderWithProviders(<ForecastRunwayInsightsWidget />);
    await screen.findByText(/runway outlook/i);

    expect(mockListDashboardTimeSeries).toHaveBeenCalledWith({
      granularity: "weekly",
      limit: 104,
      start_date: undefined,
      end_date: undefined,
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /timeframe/i }),
      "90d"
    );
    expect(mockListDashboardTimeSeries).toHaveBeenLastCalledWith({
      granularity: "weekly",
      limit: 104,
      start_date: expect.any(String),
      end_date: expect.any(String),
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /granularity/i }),
      "period"
    );
    expect(mockListDashboardTimeSeries).toHaveBeenLastCalledWith({
      granularity: "period",
      limit: 60,
      start_date: expect.any(String),
      end_date: expect.any(String),
    });
  });
});

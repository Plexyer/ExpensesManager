import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import CrossPeriodTrendWidget from "../CrossPeriodTrendWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";

const mockUseAppSelector = vi.hoisted(() => vi.fn());
const mockListPeriods = vi.hoisted(() => vi.fn());
const mockGetGridData = vi.hoisted(() => vi.fn());

vi.mock("../../../../store/hooks", () => ({
  useAppSelector: mockUseAppSelector,
}));

vi.mock("../../../../services/periodService", () => ({
  listPeriods: mockListPeriods,
}));

vi.mock("../../../../services/fileService", () => ({
  getGridData: mockGetGridData,
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

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders error state when period loading fails", async () => {
    mockListPeriods.mockRejectedValue(new Error("boom"));

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders empty state when no periods exist", async () => {
    mockListPeriods.mockResolvedValue([]);

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
    mockGetGridData.mockResolvedValue({
      budget_instance_id: 1,
      rows: [
        {
          budget_instance_category_id: 1,
          global_category_id: 1,
          category_name: "Food",
          default_amount: 0,
          default_currency: "CHF",
          sort_order: 1,
          received_total: 100,
          spent_total: 60,
          remaining: 40,
          first_received_date: null,
          last_received_date: null,
        },
      ],
    });

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
    mockGetGridData.mockImplementation(async (budgetInstanceId: number) => ({
      budget_instance_id: budgetInstanceId,
      rows: [
        {
          budget_instance_category_id: budgetInstanceId,
          global_category_id: budgetInstanceId,
          category_name: "Bills",
          default_amount: 0,
          default_currency: "CHF",
          sort_order: 1,
          received_total: 1000 + budgetInstanceId,
          spent_total: 450 + budgetInstanceId,
          remaining: 550,
          first_received_date: null,
          last_received_date: null,
        },
      ],
    }));

    renderWithProviders(<CrossPeriodTrendWidget />);
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByText(/showing 2 of 2 periods/i)).toBeInTheDocument();
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
    mockGetGridData.mockResolvedValue({
      budget_instance_id: 1,
      rows: [
        {
          budget_instance_category_id: 1,
          global_category_id: 1,
          category_name: "Groceries",
          default_amount: 0,
          default_currency: "CHF",
          sort_order: 1,
          received_total: 200,
          spent_total: 80,
          remaining: 120,
          first_received_date: null,
          last_received_date: null,
        },
      ],
    });

    renderWithProviders(<CrossPeriodTrendWidget />);
    await screen.findByTestId("line-chart");

    const periodCountSelect = screen.getByRole("combobox", {
      name: /periods to show/i,
    });
    await user.selectOptions(periodCountSelect, "3");

    expect(mockListPeriods).toHaveBeenCalledTimes(2);
  });
});

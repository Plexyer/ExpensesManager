import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import CurrentPeriodKpiWidget from "../CurrentPeriodKpiWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";

const mockUseAppSelector = vi.hoisted(() => vi.fn());
const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock("../../../../store/hooks", () => ({
  useAppSelector: mockUseAppSelector,
  useAppDispatch: () => mockDispatch,
}));

describe("CurrentPeriodKpiWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [],
          periodsStatus: "loading",
          periodsError: null,
          currentBudgetInstanceId: null,
          gridData: null,
          gridDataStatus: "idle",
          gridDataError: null,
        },
      })
    );

    renderWithProviders(<CurrentPeriodKpiWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [],
          periodsStatus: "failed",
          periodsError: "Failed to load periods",
          currentBudgetInstanceId: null,
          gridData: null,
          gridDataStatus: "idle",
          gridDataError: null,
        },
      })
    );

    renderWithProviders(<CurrentPeriodKpiWidget />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders empty state when no grid rows exist", () => {
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [{ budget_instance_id: 1 }],
          periodsStatus: "succeeded",
          periodsError: null,
          currentBudgetInstanceId: 1,
          gridData: { budget_instance_id: 1, rows: [] },
          gridDataStatus: "succeeded",
          gridDataError: null,
        },
      })
    );

    renderWithProviders(<CurrentPeriodKpiWidget />);
    expect(screen.getByText(/no data to display yet/i)).toBeInTheDocument();
  });

  it("renders KPI totals from grid rows", () => {
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [{ budget_instance_id: 1 }],
          periodsStatus: "succeeded",
          periodsError: null,
          currentBudgetInstanceId: 1,
          gridData: {
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
                spent_total: 40,
                remaining: 60,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 2,
                global_category_id: 2,
                category_name: "Rent",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 2,
                received_total: 50,
                spent_total: 70,
                remaining: -20,
                first_received_date: null,
                last_received_date: null,
              },
            ],
          },
          gridDataStatus: "succeeded",
          gridDataError: null,
        },
      })
    );

    renderWithProviders(<CurrentPeriodKpiWidget />);

    expect(screen.getByText("Total Received")).toBeInTheDocument();
    expect(screen.getByText("Total Spent")).toBeInTheDocument();
    expect(screen.getByText("Total Remaining")).toBeInTheDocument();

    expect(screen.getByText(/150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/110\.00/)).toBeInTheDocument();
    expect(screen.getByText(/40\.00/)).toBeInTheDocument();
  });

  it("uses negative semantic style for negative remaining totals", () => {
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [{ budget_instance_id: 1 }],
          periodsStatus: "succeeded",
          periodsError: null,
          currentBudgetInstanceId: 1,
          gridData: {
            budget_instance_id: 1,
            rows: [
              {
                budget_instance_category_id: 1,
                global_category_id: 1,
                category_name: "Bills",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 1,
                received_total: 10,
                spent_total: 25,
                remaining: -15,
                first_received_date: null,
                last_received_date: null,
              },
            ],
          },
          gridDataStatus: "succeeded",
          gridDataError: null,
        },
      })
    );

    renderWithProviders(<CurrentPeriodKpiWidget />);
    expect(screen.getByTestId("kpi-remaining-value")).toHaveClass("text-red-300");
  });
});


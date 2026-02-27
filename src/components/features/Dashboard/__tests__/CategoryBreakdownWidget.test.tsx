import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import CategoryBreakdownWidget from "../CategoryBreakdownWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";

const mockUseAppSelector = vi.hoisted(() => vi.fn());
const mockDispatch = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("../../../../store/hooks", () => ({
  useAppSelector: mockUseAppSelector,
  useAppDispatch: () => mockDispatch,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="pie-cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe("CategoryBreakdownWidget", () => {
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

    renderWithProviders(<CategoryBreakdownWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [],
          periodsStatus: "failed",
          periodsError: "boom",
          currentBudgetInstanceId: null,
          gridData: null,
          gridDataStatus: "idle",
          gridDataError: null,
        },
      })
    );

    renderWithProviders(<CategoryBreakdownWidget />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders no-spending state when all categories are zero", () => {
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
                default_amount: 100,
                default_currency: "CHF",
                sort_order: 1,
                received_total: 100,
                spent_total: 0,
                remaining: 100,
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

    renderWithProviders(<CategoryBreakdownWidget />);
    expect(screen.getByText(/no spending has been recorded/i)).toBeInTheDocument();
  });

  it("renders top categories and aggregates overflow into other", () => {
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
                category_name: "Rent",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 1,
                received_total: 0,
                spent_total: 900,
                remaining: -900,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 2,
                global_category_id: 2,
                category_name: "Food",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 2,
                received_total: 0,
                spent_total: 600,
                remaining: -600,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 3,
                global_category_id: 3,
                category_name: "Transport",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 3,
                received_total: 0,
                spent_total: 300,
                remaining: -300,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 4,
                global_category_id: 4,
                category_name: "Bills",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 4,
                received_total: 0,
                spent_total: 200,
                remaining: -200,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 5,
                global_category_id: 5,
                category_name: "Leisure",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 5,
                received_total: 0,
                spent_total: 100,
                remaining: -100,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 6,
                global_category_id: 6,
                category_name: "Utilities",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 6,
                received_total: 0,
                spent_total: 50,
                remaining: -50,
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

    renderWithProviders(<CategoryBreakdownWidget />);
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Leisure")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.queryByText("Utilities")).not.toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("navigates to period details when action is clicked", async () => {
    const user = userEvent.setup();
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
                received_total: 0,
                spent_total: 40,
                remaining: -40,
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

    renderWithProviders(<CategoryBreakdownWidget />);
    await user.click(screen.getByRole("button", { name: /open period details/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/periods");
  });
});

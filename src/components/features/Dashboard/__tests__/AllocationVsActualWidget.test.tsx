import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AllocationVsActualWidget from "../AllocationVsActualWidget";
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

describe("AllocationVsActualWidget", () => {
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

    renderWithProviders(<AllocationVsActualWidget />);
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

    renderWithProviders(<AllocationVsActualWidget />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders empty state when no rows exist", () => {
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

    renderWithProviders(<AllocationVsActualWidget />);
    expect(screen.getByText(/no data to display yet/i)).toBeInTheDocument();
  });

  it("renders sorted variance rows and accessibility-safe state labels", () => {
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
                default_amount: 1000,
                default_currency: "CHF",
                sort_order: 1,
                received_total: 1200,
                spent_total: 1300,
                remaining: -100,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 2,
                global_category_id: 2,
                category_name: "Food",
                default_amount: 600,
                default_currency: "CHF",
                sort_order: 2,
                received_total: 1200,
                spent_total: 420,
                remaining: 780,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 3,
                global_category_id: 3,
                category_name: "Bills",
                default_amount: 200,
                default_currency: "CHF",
                sort_order: 3,
                received_total: 200,
                spent_total: 200,
                remaining: 0,
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

    renderWithProviders(<AllocationVsActualWidget />);

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Bills")).toBeInTheDocument();
    expect(screen.getByText(/over target/i)).toBeInTheDocument();
    expect(screen.getByText(/under target/i)).toBeInTheDocument();
    expect(screen.getByText(/on target/i)).toBeInTheDocument();
    expect(screen.getByText(/variance: 30\.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/variance: -30\.0%/i)).toBeInTheDocument();
  });

  it("navigates to period details from call to action", async () => {
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
                category_name: "Rent",
                default_amount: 900,
                default_currency: "CHF",
                sort_order: 1,
                received_total: 1300,
                spent_total: 1000,
                remaining: 300,
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

    renderWithProviders(<AllocationVsActualWidget />);
    await user.click(screen.getByRole("button", { name: /open period details/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/periods");
  });
});

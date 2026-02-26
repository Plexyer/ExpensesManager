import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverspentCategoriesWidget from "../OverspentCategoriesWidget";
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

describe("OverspentCategoriesWidget", () => {
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

    renderWithProviders(<OverspentCategoriesWidget />);
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

    renderWithProviders(<OverspentCategoriesWidget />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders all-good state when no overspent categories exist", () => {
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
                category_name: "Groceries",
                default_amount: 100,
                default_currency: "CHF",
                sort_order: 1,
                received_total: 100,
                spent_total: 80,
                remaining: 20,
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

    renderWithProviders(<OverspentCategoriesWidget />);
    expect(screen.getByText(/all good/i)).toBeInTheDocument();
  });

  it("renders overspent categories and formatted amounts", () => {
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
                spent_total: 400,
                remaining: -400,
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
                spent_total: 120,
                remaining: -120,
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

    renderWithProviders(<OverspentCategoriesWidget />);
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText(/400\.00/)).toBeInTheDocument();
    expect(screen.getByText(/120\.00/)).toBeInTheDocument();
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

    renderWithProviders(<OverspentCategoriesWidget />);
    await user.click(screen.getByRole("button", { name: /open period details/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/periods");
  });
});


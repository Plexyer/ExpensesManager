import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InactiveCategoriesWidget from "../InactiveCategoriesWidget";
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

describe("InactiveCategoriesWidget", () => {
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

    renderWithProviders(<InactiveCategoriesWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders all-active state when there are no inactive categories", () => {
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
                received_total: 10,
                spent_total: 5,
                remaining: 5,
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

    renderWithProviders(<InactiveCategoriesWidget />);
    expect(screen.getByText(/all categories have activity/i)).toBeInTheDocument();
  });

  it("lists categories with zero received and spent activity", () => {
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
                category_name: "Utilities",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 1,
                received_total: 0,
                spent_total: 0,
                remaining: 0,
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
                received_total: 20,
                spent_total: 0,
                remaining: 20,
                first_received_date: null,
                last_received_date: null,
              },
              {
                budget_instance_category_id: 3,
                global_category_id: 3,
                category_name: "Savings",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 3,
                received_total: 0,
                spent_total: 0,
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

    renderWithProviders(<InactiveCategoriesWidget />);
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Utilities")).toBeInTheDocument();
    expect(screen.getByText("2 inactive categories")).toBeInTheDocument();
    expect(screen.queryByText("Rent")).not.toBeInTheDocument();
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
                category_name: "Insurance",
                default_amount: 0,
                default_currency: "CHF",
                sort_order: 1,
                received_total: 0,
                spent_total: 0,
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

    renderWithProviders(<InactiveCategoriesWidget />);
    await user.click(screen.getByRole("button", { name: /open period details/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/periods");
  });
});


import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecentPeriodsWidget from "../RecentPeriodsWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { setCurrentBudgetInstanceId, setShowPeriodSelector } from "../../../../store/slices/budgetSlice";

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

describe("RecentPeriodsWidget", () => {
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
        },
      })
    );

    renderWithProviders(<RecentPeriodsWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders empty state when no periods exist", () => {
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [],
          periodsStatus: "succeeded",
          periodsError: null,
          currentBudgetInstanceId: null,
        },
      })
    );

    renderWithProviders(<RecentPeriodsWidget />);
    expect(screen.getByText(/no data to display yet/i)).toBeInTheDocument();
  });

  it("renders recent periods in descending order and marks active period", () => {
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [
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
            {
              budget_instance_id: 2,
              cadence: "monthly",
              start_date: "2026-03-01",
              end_date: "2026-03-31",
              template_id: 1,
              template_name: "March",
              income_arrival_date: null,
              created_at: "2026-03-01",
            },
          ],
          periodsStatus: "succeeded",
          periodsError: null,
          currentBudgetInstanceId: 2,
        },
      })
    );

    renderWithProviders(<RecentPeriodsWidget />);
    const periodButtons = screen.getAllByRole("button");
    expect(periodButtons[0]).toHaveTextContent("March");
    expect(periodButtons[1]).toHaveTextContent("January");
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("opens selected period and navigates to period view", async () => {
    const user = userEvent.setup();
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: {
          periods: [
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
          ],
          periodsStatus: "succeeded",
          periodsError: null,
          currentBudgetInstanceId: null,
        },
      })
    );

    renderWithProviders(<RecentPeriodsWidget />);
    await user.click(screen.getByRole("button", { name: /open period april/i }));

    expect(mockDispatch).toHaveBeenCalledWith(setCurrentBudgetInstanceId(4));
    expect(mockDispatch).toHaveBeenCalledWith(setShowPeriodSelector(false));
    expect(mockNavigate).toHaveBeenCalledWith("/periods");
  });
});


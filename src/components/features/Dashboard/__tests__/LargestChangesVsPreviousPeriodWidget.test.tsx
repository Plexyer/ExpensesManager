import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LargestChangesVsPreviousPeriodWidget from "../LargestChangesVsPreviousPeriodWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";

const mockUseAppSelector = vi.hoisted(() => vi.fn());
const mockListPeriods = vi.hoisted(() => vi.fn());
const mockGetGridData = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("../../../../store/hooks", () => ({
  useAppSelector: mockUseAppSelector,
}));

vi.mock("../../../../services/periodService", () => ({
  listPeriods: mockListPeriods,
}));

vi.mock("../../../../services/fileService", () => ({
  getGridData: mockGetGridData,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LargestChangesVsPreviousPeriodWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: { currentBudgetInstanceId: null },
      })
    );
  });

  it("renders loading state", () => {
    mockListPeriods.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<LargestChangesVsPreviousPeriodWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders error state when period loading fails", async () => {
    mockListPeriods.mockRejectedValue(new Error("boom"));

    renderWithProviders(<LargestChangesVsPreviousPeriodWidget />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("renders empty state when no periods exist", async () => {
    mockListPeriods.mockResolvedValue([]);

    renderWithProviders(<LargestChangesVsPreviousPeriodWidget />);
    expect(await screen.findByText(/no data to display yet/i)).toBeInTheDocument();
  });

  it("renders insufficient-data state when one period exists", async () => {
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

    renderWithProviders(<LargestChangesVsPreviousPeriodWidget />);
    expect(await screen.findByText(/at least two periods are required/i)).toBeInTheDocument();
  });

  it("renders largest category deltas with mismatch-safe zero fill", async () => {
    mockListPeriods.mockResolvedValue([
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

    mockGetGridData.mockImplementation(async (budgetInstanceId: number) => {
      if (budgetInstanceId === 2) {
        return {
          budget_instance_id: 2,
          rows: [
            {
              budget_instance_category_id: 1,
              global_category_id: 1,
              category_name: "Food",
              default_amount: 0,
              default_currency: "CHF",
              sort_order: 1,
              received_total: 1000,
              spent_total: 700,
              remaining: 300,
              first_received_date: null,
              last_received_date: null,
            },
            {
              budget_instance_category_id: 2,
              global_category_id: 2,
              category_name: "Travel",
              default_amount: 0,
              default_currency: "CHF",
              sort_order: 2,
              received_total: 500,
              spent_total: 100,
              remaining: 400,
              first_received_date: null,
              last_received_date: null,
            },
          ],
        };
      }

      return {
        budget_instance_id: 1,
        rows: [
          {
            budget_instance_category_id: 3,
            global_category_id: 1,
            category_name: "Food",
            default_amount: 0,
            default_currency: "CHF",
            sort_order: 1,
            received_total: 900,
            spent_total: 200,
            remaining: 700,
            first_received_date: null,
            last_received_date: null,
          },
        ],
      };
    });

    renderWithProviders(<LargestChangesVsPreviousPeriodWidget />);

    expect(await screen.findByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.getByText(/comparing february vs january/i)).toBeInTheDocument();
    expect(screen.getByText(/\+CHF\s?500\.00/i)).toBeInTheDocument();
  });

  it("re-sorts deltas when metric mode changes", async () => {
    const user = userEvent.setup();

    mockListPeriods.mockResolvedValue([
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

    mockGetGridData.mockImplementation(async (budgetInstanceId: number) => {
      if (budgetInstanceId === 2) {
        return {
          budget_instance_id: 2,
          rows: [
            {
              budget_instance_category_id: 1,
              global_category_id: 1,
              category_name: "Salary",
              default_amount: 0,
              default_currency: "CHF",
              sort_order: 1,
              received_total: 1800,
              spent_total: 500,
              remaining: 1300,
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
              received_total: 0,
              spent_total: 1200,
              remaining: -1200,
              first_received_date: null,
              last_received_date: null,
            },
          ],
        };
      }

      return {
        budget_instance_id: 1,
        rows: [
          {
            budget_instance_category_id: 3,
            global_category_id: 1,
            category_name: "Salary",
            default_amount: 0,
            default_currency: "CHF",
            sort_order: 1,
            received_total: 1000,
            spent_total: 300,
            remaining: 700,
            first_received_date: null,
            last_received_date: null,
          },
          {
            budget_instance_category_id: 4,
            global_category_id: 2,
            category_name: "Rent",
            default_amount: 0,
            default_currency: "CHF",
            sort_order: 2,
            received_total: 0,
            spent_total: 900,
            remaining: -900,
            first_received_date: null,
            last_received_date: null,
          },
        ],
      };
    });

    renderWithProviders(<LargestChangesVsPreviousPeriodWidget />);
    await screen.findByText("Salary");

    const metricSelect = screen.getByRole("combobox", {
      name: /delta metric/i,
    });
    await user.selectOptions(metricSelect, "received_total");

    expect(screen.getByText(/increase/i)).toBeInTheDocument();
  });

  it("navigates to period details", async () => {
    const user = userEvent.setup();

    mockListPeriods.mockResolvedValue([
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
          category_name: "Food",
          default_amount: 0,
          default_currency: "CHF",
          sort_order: 1,
          received_total: 100,
          spent_total: 50,
          remaining: 50,
          first_received_date: null,
          last_received_date: null,
        },
      ],
    });

    renderWithProviders(<LargestChangesVsPreviousPeriodWidget />);
    await screen.findByRole("button", { name: /open period details/i });

    await user.click(screen.getByRole("button", { name: /open period details/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/periods");
  });
});

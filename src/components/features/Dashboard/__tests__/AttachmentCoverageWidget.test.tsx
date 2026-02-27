import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttachmentCoverageWidget from "../AttachmentCoverageWidget";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { resetDashboardRequestDeduperForTests } from "../dashboardRequestDeduper";

const mockUseAppSelector = vi.hoisted(() => vi.fn());
const mockListPeriods = vi.hoisted(() => vi.fn());
const mockGetGridData = vi.hoisted(() => vi.fn());
const mockListLineItems = vi.hoisted(() => vi.fn());
const mockGetAttachmentCounts = vi.hoisted(() => vi.fn());
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

vi.mock("../../../../services/lineItemService", () => ({
  listLineItems: mockListLineItems,
}));

vi.mock("../../../../services/attachmentService", () => ({
  getAttachmentCounts: mockGetAttachmentCounts,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AttachmentCoverageWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDashboardRequestDeduperForTests();
    mockUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        file: { isFileOpen: true },
        budget: { currentBudgetInstanceId: null },
      })
    );
  });

  it("renders loading state", () => {
    mockListPeriods.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AttachmentCoverageWidget />);
    expect(screen.getByText(/loading widget data/i)).toBeInTheDocument();
  });

  it("renders empty state when no periods exist", async () => {
    mockListPeriods.mockResolvedValue([]);

    renderWithProviders(<AttachmentCoverageWidget />);
    expect(await screen.findByText(/no data to display yet/i)).toBeInTheDocument();
  });

  it("renders zero-transaction message cleanly", async () => {
    mockListPeriods.mockResolvedValue([
      {
        budget_instance_id: 10,
        cadence: "monthly",
        start_date: "2026-02-01",
        end_date: "2026-02-28",
        template_id: 1,
        template_name: "February",
        income_arrival_date: null,
        created_at: "2026-02-01",
      },
    ]);
    mockGetGridData.mockResolvedValue({
      budget_instance_id: 10,
      rows: [
        {
          budget_instance_category_id: 1,
          global_category_id: 1,
          category_name: "Food",
          default_amount: 100,
          default_currency: "CHF",
          sort_order: 1,
          received_total: 0,
          spent_total: 0,
          remaining: 0,
          first_received_date: null,
          last_received_date: null,
        },
      ],
    });
    mockListLineItems.mockResolvedValue([]);
    mockGetAttachmentCounts.mockResolvedValue({});

    renderWithProviders(<AttachmentCoverageWidget />);
    expect(
      await screen.findByText(/no transactions found in the selected period/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/total attachments: 0/i)).toBeInTheDocument();
  });

  it("calculates received, spent, and overall coverage with attachment totals", async () => {
    mockListPeriods.mockResolvedValue([
      {
        budget_instance_id: 22,
        cadence: "monthly",
        start_date: "2026-03-01",
        end_date: "2026-03-31",
        template_id: 1,
        template_name: "March",
        income_arrival_date: null,
        created_at: "2026-03-01",
      },
    ]);
    mockGetGridData.mockResolvedValue({
      budget_instance_id: 22,
      rows: [
        {
          budget_instance_category_id: 100,
          global_category_id: 1,
          category_name: "Salary",
          default_amount: 0,
          default_currency: "CHF",
          sort_order: 1,
          received_total: 5000,
          spent_total: 0,
          remaining: 5000,
          first_received_date: null,
          last_received_date: null,
        },
        {
          budget_instance_category_id: 101,
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
      ],
    });
    mockListLineItems.mockImplementation(
      async (budgetInstanceCategoryId: number, kind: "received" | "spent") => {
        if (budgetInstanceCategoryId === 100 && kind === "received") {
          return [
            {
              line_item_id: 1,
              budget_instance_category_id: 100,
              kind: "received",
              occurred_at: "2026-03-01T00:00:00",
              description: "Salary",
              amount: 5000,
              currency: "CHF",
              notes: null,
              is_template_default: true,
              created_at: "2026-03-01T00:00:00",
              updated_at: "2026-03-01T00:00:00",
            },
          ];
        }

        if (budgetInstanceCategoryId === 101 && kind === "spent") {
          return [
            {
              line_item_id: 2,
              budget_instance_category_id: 101,
              kind: "spent",
              occurred_at: "2026-03-02T00:00:00",
              description: "Groceries",
              amount: 100,
              currency: "CHF",
              notes: null,
              is_template_default: false,
              created_at: "2026-03-02T00:00:00",
              updated_at: "2026-03-02T00:00:00",
            },
            {
              line_item_id: 3,
              budget_instance_category_id: 101,
              kind: "spent",
              occurred_at: "2026-03-03T00:00:00",
              description: "Restaurant",
              amount: 50,
              currency: "CHF",
              notes: null,
              is_template_default: false,
              created_at: "2026-03-03T00:00:00",
              updated_at: "2026-03-03T00:00:00",
            },
          ];
        }

        return [];
      }
    );
    mockGetAttachmentCounts.mockResolvedValue({
      "1": 2,
      "2": 1,
    });

    renderWithProviders(<AttachmentCoverageWidget />);
    expect(await screen.findByText(/coverage: 100\.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/coverage: 50\.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/coverage: 66\.7%/i)).toBeInTheDocument();
    expect(screen.getByText(/total attachments: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/covered transactions: 2 \/ 3/i)).toBeInTheDocument();
  });

  it("navigates to period details", async () => {
    const user = userEvent.setup();

    mockListPeriods.mockResolvedValue([
      {
        budget_instance_id: 44,
        cadence: "monthly",
        start_date: "2026-04-01",
        end_date: "2026-04-30",
        template_id: 1,
        template_name: "April",
        income_arrival_date: null,
        created_at: "2026-04-01",
      },
    ]);
    mockGetGridData.mockResolvedValue({
      budget_instance_id: 44,
      rows: [],
    });
    mockListLineItems.mockResolvedValue([]);
    mockGetAttachmentCounts.mockResolvedValue({});

    renderWithProviders(<AttachmentCoverageWidget />);
    await user.click(await screen.findByRole("button", { name: /open period details/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/periods");
  });
});

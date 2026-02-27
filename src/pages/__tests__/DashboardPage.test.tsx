import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import DashboardPage from "../DashboardPage";
import { renderWithProviders } from "../../test/renderWithProviders";

const mockedUseAppSelector = vi.hoisted(() => vi.fn());
const mockedUseAppDispatch = vi.hoisted(() => vi.fn());
const mockedNavigate = vi.hoisted(() => vi.fn());

vi.mock("../../store/hooks", () => ({
  useAppSelector: mockedUseAppSelector,
  useAppDispatch: mockedUseAppDispatch,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock("../../components/common/AppHeader", () => ({
  default: () => <div data-testid="app-header">Header</div>,
}));

vi.mock("../../components/features/Onboarding/Onboarding", () => ({
  default: () => <div data-testid="onboarding">Onboarding</div>,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    mockedUseAppDispatch.mockReturnValue(vi.fn());
  });

  it("shows onboarding when no file is open", () => {
    mockedUseAppSelector.mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({
          file: { isFileOpen: false },
          budget: {},
        })
    );
    renderWithProviders(<DashboardPage />);

    expect(screen.getByTestId("onboarding")).toBeInTheDocument();
  });

  it("shows dashboard shell when file is open", async () => {
    mockedUseAppSelector.mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({
          file: { isFileOpen: true },
          budget: {
            periods: [],
            periodsStatus: "idle",
            periodsError: null,
            currentBudgetInstanceId: null,
            gridData: null,
            gridDataStatus: "idle",
            gridDataError: null,
          },
        })
    );
    renderWithProviders(<DashboardPage />);

    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});


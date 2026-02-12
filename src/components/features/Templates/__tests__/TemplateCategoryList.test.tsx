import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TemplateCategoryList from "../TemplateCategoryList";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import i18n from "../../../../i18n";
import type { TemplateCategory } from "../../../../types/template.types";

const mockCategories: TemplateCategory[] = [
  {
    template_category_id: 1,
    global_category_id: 10,
    category_name: "Food",
    allocated_amount: 50.0,
    category_type: "expense",
    sort_order: 1,
  },
  {
    template_category_id: 2,
    global_category_id: 20,
    category_name: "Rent",
    allocated_amount: 400.0,
    category_type: "expense",
    sort_order: 2,
  },
  {
    template_category_id: 3,
    global_category_id: 30,
    category_name: "Household",
    allocated_amount: 150.75,
    category_type: "expense",
    sort_order: 3,
  },
];

describe("TemplateCategoryList", () => {
  const mockOnRemove = vi.fn();
  const mockOnUpdateAmount = vi.fn();
  const mockOnReorder = vi.fn();

  beforeEach(() => {
    i18n.changeLanguage("en");
    vi.clearAllMocks();
  });

  const renderList = (categories = mockCategories) =>
    renderWithProviders(
      <TemplateCategoryList
        categories={categories}
        currency="CHF"
        onRemove={mockOnRemove}
        onUpdateAmount={mockOnUpdateAmount}
        onReorder={mockOnReorder}
      />
    );

  it("renders all categories with correct names and amounts", () => {
    renderList();

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("CHF 50.00")).toBeInTheDocument();

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("CHF 400.00")).toBeInTheDocument();

    expect(screen.getByText("Household")).toBeInTheDocument();
    expect(screen.getByText("CHF 150.75")).toBeInTheDocument();
  });

  it("renders empty message when no categories", () => {
    renderList([]);
    expect(
      screen.getByText(/no categories added yet/i)
    ).toBeInTheDocument();
  });

  it("calls onRemove when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    // Mock window.confirm to return true
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderList();

    const removeButtons = screen.getAllByRole("button", {
      name: /remove .* from template/i,
    });
    expect(removeButtons).toHaveLength(3);

    await user.click(removeButtons[0]);
    expect(mockOnRemove).toHaveBeenCalledWith(1);
  });

  it("enters edit mode when edit button is clicked", async () => {
    const user = userEvent.setup();
    renderList();

    const editButtons = screen.getAllByRole("button", {
      name: /edit .*/i,
    });
    expect(editButtons).toHaveLength(3);

    await user.click(editButtons[0]);

    // Should now show an input with the amount
    const input = screen.getByRole("spinbutton", { name: /edit amount/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(50.0);
  });

  it("saves new amount on Enter key press", async () => {
    const user = userEvent.setup();
    renderList();

    // Click edit on Food
    const editButtons = screen.getAllByRole("button", {
      name: /edit .*/i,
    });
    await user.click(editButtons[0]);

    const input = screen.getByRole("spinbutton", { name: /edit amount/i });

    // Clear and type new value
    await user.clear(input);
    await user.type(input, "75.50");
    await user.keyboard("{Enter}");

    expect(mockOnUpdateAmount).toHaveBeenCalledWith(1, 75.5);
  });

  it("cancels edit on Escape key press", async () => {
    const user = userEvent.setup();
    renderList();

    const editButtons = screen.getAllByRole("button", {
      name: /edit .*/i,
    });
    await user.click(editButtons[0]);

    const input = screen.getByRole("spinbutton", { name: /edit amount/i });
    await user.clear(input);
    await user.type(input, "999");
    await user.keyboard("{Escape}");

    // Should not have called update
    expect(mockOnUpdateAmount).not.toHaveBeenCalled();

    // Should be back in view mode showing original amount
    expect(screen.getByText("CHF 50.00")).toBeInTheDocument();
  });

  it("renders drag handles with correct aria-labels", () => {
    renderList();

    expect(
      screen.getByLabelText("Drag to reorder Food")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Drag to reorder Rent")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Drag to reorder Household")
    ).toBeInTheDocument();
  });

  it("renders edit buttons with correct aria-labels", () => {
    renderList();

    expect(screen.getByLabelText("Edit Food")).toBeInTheDocument();
    expect(screen.getByLabelText("Edit Rent")).toBeInTheDocument();
    expect(screen.getByLabelText("Edit Household")).toBeInTheDocument();
  });

  it("renders remove buttons with correct aria-labels", () => {
    renderList();

    expect(
      screen.getByLabelText("Remove Food from template")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Remove Rent from template")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Remove Household from template")
    ).toBeInTheDocument();
  });

  it("renders categories in the correct order", () => {
    renderList();

    const categoryNames = screen
      .getAllByText(/^(Food|Rent|Household)$/)
      .map((el) => el.textContent);

    expect(categoryNames).toEqual(["Food", "Rent", "Household"]);
  });
});

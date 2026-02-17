import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileSizeWarningDialog from "../FileSizeWarningDialog";
import { renderWithProviders } from "../../../test/renderWithProviders";
import i18n from "../../../i18n";

// ── Helpers ──

const defaultProps = {
  isOpen: true,
  fileName: "large-report.pdf",
  fileSize: 30 * 1024 * 1024, // 30 MB
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  defaultProps.onConfirm.mockClear();
  defaultProps.onCancel.mockClear();
  i18n.changeLanguage("en");
});

// ── Rendering Tests ──

describe("FileSizeWarningDialog — Rendering", () => {
  it("renders the alertdialog when isOpen is true", () => {
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("does NOT render anything when isOpen is false", () => {
    renderWithProviders(
      <FileSizeWarningDialog {...defaultProps} isOpen={false} />
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows the warning title", () => {
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    expect(screen.getByText("Large File Warning")).toBeInTheDocument();
  });

  it("shows the filename in the warning message", () => {
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    expect(
      screen.getByText(/large-report\.pdf/, { exact: false })
    ).toBeInTheDocument();
  });

  it("shows the formatted file size in the warning message", () => {
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    expect(screen.getByText(/30 MB/, { exact: false })).toBeInTheDocument();
  });

  it("has correct ARIA attributes on the dialog", () => {
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute(
      "aria-labelledby",
      "file-size-warning-title"
    );
    expect(dialog).toHaveAttribute(
      "aria-describedby",
      "file-size-warning-desc"
    );
  });
});

// ── Interaction Tests ──

describe("FileSizeWarningDialog — Interactions", () => {
  it("calls onConfirm when 'Upload Anyway' is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    const confirmBtn = screen.getByRole("button", {
      name: /upload.*anyway/i,
    });
    await user.click(confirmBtn);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when 'Cancel' is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel when the backdrop overlay is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    // The backdrop has role="presentation"
    const backdrop = screen.getByRole("presentation");
    // Click the backdrop itself (not the dialog inside it)
    await user.click(backdrop);

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("calls onCancel on Escape key", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    // Focus the dialog then press Escape
    const dialog = screen.getByRole("alertdialog");
    dialog.focus();
    await user.keyboard("{Escape}");

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onCancel when clicking inside the dialog content", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    const dialog = screen.getByRole("alertdialog");
    await user.click(dialog);

    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });
});

// ── Focus Management Tests ──

describe("FileSizeWarningDialog — Focus", () => {
  it("focuses the dialog element when opened", () => {
    renderWithProviders(<FileSizeWarningDialog {...defaultProps} />);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveFocus();
  });
});

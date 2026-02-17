import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttachmentIndicator from "../AttachmentIndicator";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import i18n from "../../../../i18n";

// ── Helpers ──

const defaultProps = {
  lineItemId: 1,
  attachmentCount: 0,
  firstThumbnail: null as string | null,
  firstMimeType: null as string | null,
  onClick: vi.fn(),
};

beforeEach(() => {
  defaultProps.onClick.mockClear();
  i18n.changeLanguage("en");
});

// ── Visual State Tests ──

describe("AttachmentIndicator — Visual states", () => {
  it("renders camera icon (button) when attachmentCount is 0", () => {
    renderWithProviders(<AttachmentIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    // No <img> should be rendered for zero-attachment state
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });

  it("renders thumbnail image when count > 0, image MIME type, and thumbnail present", () => {
    const { container } = renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={1}
        firstThumbnail="data:image/jpeg;base64,/9j/test"
        firstMimeType="image/jpeg"
      />
    );

    // The <img> has alt="" + aria-hidden="true" → role is "presentation", not "img"
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/jpeg;base64,/9j/test");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
  });

  it("renders file icon (no <img>) when count > 0 and non-image MIME type", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={1}
        firstThumbnail={null}
        firstMimeType="application/pdf"
      />
    );

    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders file icon when count > 0 but thumbnail is null (image MIME)", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={1}
        firstThumbnail={null}
        firstMimeType="image/jpeg"
      />
    );

    // No thumbnail available despite image MIME type → file icon state
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });

  it("renders file icon when count > 0 but MIME type is null", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={2}
        firstThumbnail="data:image/jpeg;base64,/9j/test"
        firstMimeType={null}
      />
    );

    // null MIME type → not an image → file icon
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });
});

// ── Count Badge Tests ──

describe("AttachmentIndicator — Count badge", () => {
  it("does NOT show badge when count is 0", () => {
    renderWithProviders(<AttachmentIndicator {...defaultProps} />);

    // No numeric badge text
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it("does NOT show badge when count is 1", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={1}
        firstThumbnail="data:image/jpeg;base64,thumb"
        firstMimeType="image/jpeg"
      />
    );

    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("shows badge with count when count is 2", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={2}
        firstThumbnail="data:image/jpeg;base64,thumb"
        firstMimeType="image/jpeg"
      />
    );

    const badge = screen.getByText("2");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-hidden", "true");
  });

  it("shows badge with count when count is 5", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={5}
        firstThumbnail={null}
        firstMimeType="application/pdf"
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows '99+' badge when count exceeds 99", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={150}
        firstThumbnail="data:image/jpeg;base64,thumb"
        firstMimeType="image/jpeg"
      />
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});

// ── Interaction Tests ──

describe("AttachmentIndicator — Interactions", () => {
  it("calls onClick when the button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttachmentIndicator {...defaultProps} />);

    await user.click(screen.getByRole("button"));

    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when Enter key is pressed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttachmentIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard("{Enter}");

    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when Space key is pressed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttachmentIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard(" ");

    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });
});

// ── Accessibility Tests ──

describe("AttachmentIndicator — Accessibility", () => {
  it("has 'Attach file' aria-label when no attachments", () => {
    renderWithProviders(<AttachmentIndicator {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Attach file");
    expect(button).toHaveAttribute("title", "Attach file");
  });

  it("has view-count aria-label for a single attachment", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={1}
        firstThumbnail="data:image/jpeg;base64,thumb"
        firstMimeType="image/jpeg"
      />
    );

    const button = screen.getByRole("button");
    // i18next singular: "View 1 attachment"
    expect(button).toHaveAttribute(
      "aria-label",
      expect.stringContaining("1")
    );
  });

  it("has view-count aria-label for multiple attachments", () => {
    renderWithProviders(
      <AttachmentIndicator
        {...defaultProps}
        attachmentCount={5}
        firstThumbnail="data:image/jpeg;base64,thumb"
        firstMimeType="image/jpeg"
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "aria-label",
      expect.stringContaining("5")
    );
  });

  it("has data-line-item-id attribute matching the lineItemId prop", () => {
    renderWithProviders(
      <AttachmentIndicator {...defaultProps} lineItemId={42} />
    );

    expect(screen.getByRole("button")).toHaveAttribute(
      "data-line-item-id",
      "42"
    );
  });

  it("has tabIndex=0 for keyboard focus", () => {
    renderWithProviders(<AttachmentIndicator {...defaultProps} />);

    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "0");
  });
});

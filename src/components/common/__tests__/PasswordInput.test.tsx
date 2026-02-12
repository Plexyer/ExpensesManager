import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordInput from "../PasswordInput";
import { renderWithProviders } from "../../../test/renderWithProviders";

describe("PasswordInput", () => {
  const defaultProps = {
    label: "Password",
    value: "secret123",
    onChange: vi.fn(),
  };

  it("renders with label and password input", () => {
    renderWithProviders(<PasswordInput {...defaultProps} />);

    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("toggles password visibility on button click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PasswordInput {...defaultProps} />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    // Click the toggle button
    const toggleBtn = screen.getByRole("button");
    await user.click(toggleBtn);

    expect(input).toHaveAttribute("type", "text");

    // Click again to hide
    await user.click(toggleBtn);
    expect(input).toHaveAttribute("type", "password");
  });

  it("calls onChange when typing", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <PasswordInput {...defaultProps} value="" onChange={handleChange} />
    );

    const input = screen.getByLabelText("Password");
    await user.type(input, "a");

    expect(handleChange).toHaveBeenCalledWith("a");
  });

  it("renders error message when error prop is provided", () => {
    renderWithProviders(
      <PasswordInput {...defaultProps} error="Password is too short" />
    );

    expect(screen.getByText("Password is too short")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("sets aria-invalid when error is provided", () => {
    renderWithProviders(
      <PasswordInput {...defaultProps} error="Invalid password" />
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("renders placeholder text", () => {
    renderWithProviders(
      <PasswordInput {...defaultProps} placeholder="Enter password" />
    );

    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
  });

  it("disables input and toggle button when disabled", () => {
    renderWithProviders(<PasswordInput {...defaultProps} disabled />);

    expect(screen.getByLabelText("Password")).toBeDisabled();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

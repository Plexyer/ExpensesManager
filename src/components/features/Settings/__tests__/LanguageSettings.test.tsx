import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSettings from "../LanguageSettings";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import i18n from "../../../../i18n";

// Mock persistLanguage
vi.mock("../../../../i18n", async () => {
  const actual = await vi.importActual("../../../../i18n");
  return {
    ...actual,
    persistLanguage: vi.fn(),
  };
});

import { persistLanguage } from "../../../../i18n";

describe("LanguageSettings", () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.changeLanguage("en");
    vi.clearAllMocks();
  });

  it("renders language heading and description", () => {
    renderWithProviders(<LanguageSettings />);

    expect(
      screen.getByRole("heading", { name: /language/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose the display language for the application.")
    ).toBeInTheDocument();
  });

  it("renders all supported language options", () => {
    renderWithProviders(<LanguageSettings />);

    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Deutsch")).toBeInTheDocument();
    expect(screen.getByText("Magyar")).toBeInTheDocument();
  });

  it("has English selected by default", () => {
    renderWithProviders(<LanguageSettings />);

    const englishRadio = screen.getByDisplayValue("en");
    const germanRadio = screen.getByDisplayValue("de");

    expect(englishRadio).toBeChecked();
    expect(germanRadio).not.toBeChecked();
  });

  it("switches language and persists when German is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSettings />);

    const germanRadio = screen.getByDisplayValue("de");
    await user.click(germanRadio);

    expect(germanRadio).toBeChecked();
    expect(i18n.language).toBe("de");
    expect(persistLanguage).toHaveBeenCalledWith("de");
  });

  it("switches language and persists when English is re-selected", async () => {
    // Start in German
    i18n.changeLanguage("de");
    const user = userEvent.setup();
    renderWithProviders(<LanguageSettings />);

    const englishRadio = screen.getByDisplayValue("en");
    await user.click(englishRadio);

    expect(englishRadio).toBeChecked();
    expect(i18n.language).toBe("en");
    expect(persistLanguage).toHaveBeenCalledWith("en");
  });

  it("has proper accessibility structure", () => {
    renderWithProviders(<LanguageSettings />);

    const section = screen.getByRole("region", { name: /language/i });
    expect(section).toBeInTheDocument();

    // fieldset renders as role="group" in jsdom
    const fieldsetGroup = screen.getByRole("group", { name: /language/i });
    expect(fieldsetGroup).toBeInTheDocument();
  });
});

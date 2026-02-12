import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the i18n module before importing the function under test
vi.mock("../../i18n", () => ({
  default: { language: "en" },
}));

import { formatCurrency } from "../currency";
import i18n from "../../i18n";

describe("formatCurrency", () => {
  beforeEach(() => {
    // Reset to English before each test
    (i18n as { language: string }).language = "en";
  });

  // ── English locale (en-US) ──
  it("formats CHF correctly in English locale", () => {
    const result = formatCurrency(1234.56, "CHF");
    expect(result).toContain("1,234.56");
    expect(result).toContain("CHF");
  });

  it("formats EUR correctly in English locale", () => {
    const result = formatCurrency(99.9, "EUR");
    // Should have 2 decimal places
    expect(result).toMatch(/99\.90/);
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0, "CHF");
    expect(result).toContain("0.00");
  });

  it("formats negative numbers", () => {
    const result = formatCurrency(-50.5, "CHF");
    expect(result).toContain("50.50");
  });

  // ── German locale (de-CH) ──
  it("formats CHF correctly in German locale", () => {
    (i18n as { language: string }).language = "de";
    const result = formatCurrency(1234.56, "CHF");
    // de-CH uses different formatting (e.g., 1'234.56 or 1.234,56 depending on impl)
    expect(result).toContain("CHF");
    // Just verify it contains the digits
    expect(result).toMatch(/1.*234.*56/);
  });

  // ── Precision ──
  it("rounds to 2 decimal places", () => {
    const result = formatCurrency(10.999, "CHF");
    expect(result).toContain("11.00");
  });

  it("pads to 2 decimal places for whole numbers", () => {
    const result = formatCurrency(100, "CHF");
    expect(result).toContain("100.00");
  });
});

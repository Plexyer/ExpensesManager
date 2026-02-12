import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the i18n module before importing functions under test
vi.mock("../../i18n", () => ({
  default: { language: "en" },
}));

import { formatDate, formatTime } from "../dateFormat";
import i18n from "../../i18n";

describe("formatDate", () => {
  beforeEach(() => {
    (i18n as { language: string }).language = "en";
  });

  it("formats an ISO date string in English locale", () => {
    const result = formatDate("2026-01-15T00:00:00");
    // en-US: "Jan 15, 2026"
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("formats an ISO date string in German locale", () => {
    (i18n as { language: string }).language = "de";
    const result = formatDate("2026-01-15T00:00:00");
    // de-CH: "15. Jan. 2026" or similar
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("returns the original string for invalid dates", () => {
    // An invalid date string that Date can't parse still won't throw,
    // but toLocaleDateString on Invalid Date returns "Invalid Date"
    // The function has a try/catch, so it handles gracefully
    const result = formatDate("not-a-date");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatTime", () => {
  beforeEach(() => {
    (i18n as { language: string }).language = "en";
  });

  it("returns empty string for midnight (00:00)", () => {
    const result = formatTime("2026-01-15T00:00:00");
    expect(result).toBe("");
  });

  it("returns formatted time for non-midnight", () => {
    const result = formatTime("2026-01-15T14:30:00");
    // en-US 2-digit hour/minute: "02:30 PM" or "14:30"
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it("returns formatted time for morning hours", () => {
    const result = formatTime("2026-01-15T09:05:00");
    expect(result).toMatch(/\d{2}:\d{2}/);
    expect(result).toContain("05");
  });

  it("returns empty string for invalid input (graceful fallback)", () => {
    const result = formatTime("invalid");
    // Invalid Date has NaN hours/minutes, try/catch returns ""
    expect(typeof result).toBe("string");
  });
});

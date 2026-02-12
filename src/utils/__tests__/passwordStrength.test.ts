import { describe, it, expect } from "vitest";
import { getPasswordStrength, isStrengthAcceptable } from "../passwordStrength";

describe("getPasswordStrength", () => {
  it("returns score 0 and empty state for empty password", () => {
    const result = getPasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("Weak");
    expect(result.barWidth).toBe("w-0");
    expect(result.crackTimeDisplay).toBe("");
  });

  it("returns score 0 or 1 for very weak password", () => {
    const result = getPasswordStrength("password");
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.label).toBe("Weak");
  });

  it("returns a higher score for a strong password", () => {
    const result = getPasswordStrength("c0rr3ct-h0rse-b4ttery-st4ple!");
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it("returns feedback array", () => {
    const result = getPasswordStrength("password");
    expect(Array.isArray(result.feedback)).toBe(true);
  });

  it("returns crack time display string for non-empty password", () => {
    const result = getPasswordStrength("test12345");
    expect(typeof result.crackTimeDisplay).toBe("string");
    expect(result.crackTimeDisplay.length).toBeGreaterThan(0);
  });

  it("returns valid color class for all scores", () => {
    // Score 0 (empty) has special color
    expect(getPasswordStrength("").color).toBe("bg-slate-600");
    // Non-empty passwords should have a bg- color
    expect(getPasswordStrength("password").color).toMatch(/^bg-/);
    expect(getPasswordStrength("c0rr3ct-h0rse-b4ttery-st4ple!").color).toMatch(
      /^bg-/
    );
  });
});

describe("isStrengthAcceptable", () => {
  it("rejects score 0 (Weak)", () => {
    expect(isStrengthAcceptable(0)).toBe(false);
  });

  it("rejects score 1 (Weak)", () => {
    expect(isStrengthAcceptable(1)).toBe(false);
  });

  it("accepts score 2 (Fair)", () => {
    expect(isStrengthAcceptable(2)).toBe(true);
  });

  it("accepts score 3 (Good)", () => {
    expect(isStrengthAcceptable(3)).toBe(true);
  });

  it("accepts score 4 (Strong)", () => {
    expect(isStrengthAcceptable(4)).toBe(true);
  });
});

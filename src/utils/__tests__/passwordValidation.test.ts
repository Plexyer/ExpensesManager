import { describe, it, expect } from "vitest";
import {
  validatePassword,
  validatePasswordMatch,
  validateHint,
  getPasswordRequirements,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_HINT_LENGTH,
} from "../passwordValidation";

describe("validatePassword", () => {
  it("rejects empty password", () => {
    const result = validatePassword("");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password is required");
  });

  it("rejects password shorter than MIN_PASSWORD_LENGTH", () => {
    const result = validatePassword("short");
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain(`at least ${MIN_PASSWORD_LENGTH}`);
  });

  it("rejects password longer than MAX_PASSWORD_LENGTH", () => {
    const result = validatePassword("a".repeat(MAX_PASSWORD_LENGTH + 1));
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain(`at most ${MAX_PASSWORD_LENGTH}`);
  });

  it("accepts valid password meeting length requirement", () => {
    const result = validatePassword("a".repeat(MIN_PASSWORD_LENGTH));
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("validatePasswordMatch", () => {
  it("rejects empty confirmation", () => {
    const result = validatePasswordMatch("password123!", "");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Please confirm your password");
  });

  it("rejects mismatched passwords", () => {
    const result = validatePasswordMatch("password123!", "different456!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Passwords do not match");
  });

  it("accepts matching passwords", () => {
    const result = validatePasswordMatch("MyStr0ng!Pass", "MyStr0ng!Pass");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("validateHint", () => {
  it("accepts empty hint (optional)", () => {
    const result = validateHint("", "password123");
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("rejects hint exceeding MAX_HINT_LENGTH", () => {
    const result = validateHint("a".repeat(MAX_HINT_LENGTH + 1), "password");
    expect(result.isValid).toBe(false);
    expect(result.warnings[0]).toContain(`at most ${MAX_HINT_LENGTH}`);
  });

  it("warns if hint contains the password", () => {
    const result = validateHint(
      "My hint is password123 here",
      "password123"
    );
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("should not contain"))).toBe(
      true
    );
  });

  it("warns if password contains the hint", () => {
    const result = validateHint("cats", "my cats are great!");
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((w) => w.includes("too similar"))).toBe(true);
  });

  it("accepts valid hint that is not similar to password", () => {
    const result = validateHint("Favorite color", "Tr0ub4dor&3!xyz");
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("getPasswordRequirements", () => {
  it("returns all requirements as not met for empty password", () => {
    const reqs = getPasswordRequirements("");
    expect(reqs.every((r) => !r.met)).toBe(true);
  });

  it("marks length requirement as met for long password", () => {
    const reqs = getPasswordRequirements("a".repeat(MIN_PASSWORD_LENGTH));
    const lengthReq = reqs.find((r) => r.label.includes("characters"));
    expect(lengthReq?.met).toBe(true);
  });

  it("marks all requirements as met for strong password", () => {
    const reqs = getPasswordRequirements("Str0ng!Passw0rd");
    expect(reqs.every((r) => r.met)).toBe(true);
  });

  it("marks individual character class requirements correctly", () => {
    const reqs = getPasswordRequirements("onlylowercase");
    const lower = reqs.find((r) => r.label.includes("lowercase"));
    const upper = reqs.find((r) => r.label.includes("uppercase"));
    const number = reqs.find((r) => r.label.includes("number"));
    const special = reqs.find((r) => r.label.includes("special"));

    expect(lower?.met).toBe(true);
    expect(upper?.met).toBe(false);
    expect(number?.met).toBe(false);
    expect(special?.met).toBe(false);
  });
});

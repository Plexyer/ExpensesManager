import { describe, it, expect } from "vitest";
import { formatErrorMessage } from "../formatErrorMessage";

describe("formatErrorMessage", () => {
  // ── Falsy / empty inputs ──
  it("returns fallback for null", () => {
    expect(formatErrorMessage(null)).toBe("Something went wrong. Please try again.");
  });

  it("returns fallback for undefined", () => {
    expect(formatErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });

  it("returns fallback for empty string", () => {
    expect(formatErrorMessage("")).toBe("Something went wrong. Please try again.");
  });

  it("returns custom fallback when provided", () => {
    expect(formatErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
  });

  // ── Known pattern matching ──
  it("maps 'database is locked' to friendly message", () => {
    expect(formatErrorMessage("database is locked")).toBe(
      "The database is busy. Please try again in a moment."
    );
  });

  it("maps 'no such table' to friendly message", () => {
    expect(formatErrorMessage("no such table: budget_templates")).toBe(
      "The database structure is outdated. Please re-open the file."
    );
  });

  it("maps 'file is not a database' to friendly message", () => {
    expect(formatErrorMessage("file is not a database")).toBe(
      "This file is not a valid database or the password is incorrect."
    );
  });

  it("maps 'incorrect password' to friendly message", () => {
    expect(formatErrorMessage("incorrect password for key")).toBe(
      "The password you entered is incorrect."
    );
  });

  it("maps 'unique constraint' to friendly message", () => {
    expect(formatErrorMessage("UNIQUE constraint failed: categories.name")).toBe(
      "A record with the same value already exists."
    );
  });

  it("maps 'foreign key constraint' to friendly message", () => {
    expect(formatErrorMessage("FOREIGN KEY constraint failed")).toBe(
      "Cannot complete this action because related data depends on it."
    );
  });

  it("maps 'disk i/o error' to friendly message", () => {
    expect(formatErrorMessage("disk i/o error on read")).toBe(
      "Could not access the file. Make sure it exists and is not in use."
    );
  });

  // ── Rust prefix stripping ──
  it("strips Rust-style error prefixes", () => {
    expect(formatErrorMessage("EncryptedDbError: database is locked")).toBe(
      "The database is busy. Please try again in a moment."
    );
  });

  // ── Error object input ──
  it("handles Error objects", () => {
    const err = new Error("database is locked");
    expect(formatErrorMessage(err)).toBe(
      "The database is busy. Please try again in a moment."
    );
  });

  // ── Technical / long strings ──
  it("returns fallback for long technical strings", () => {
    const longTechMsg = "a".repeat(121);
    expect(formatErrorMessage(longTechMsg)).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("returns fallback for messages with :: (Rust paths)", () => {
    expect(formatErrorMessage("rusqlite::Error::QueryReturnedNoRows")).toBe(
      "Something went wrong. Please try again."
    );
  });

  // ── Pass-through for human-readable messages ──
  it("passes through short human-readable messages", () => {
    expect(formatErrorMessage("Period not found")).toBe("Period not found");
  });
});

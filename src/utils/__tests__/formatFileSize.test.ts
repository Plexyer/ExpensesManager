import { describe, it, expect } from "vitest";
import { formatFileSize, FILE_SIZE_SOFT_LIMIT } from "../formatFileSize";

describe("formatFileSize", () => {
  // ── Zero / edge cases ──
  it("formats 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("handles negative input gracefully", () => {
    expect(formatFileSize(-100)).toBe("0 B");
  });

  // ── Bytes ──
  it("formats small byte values", () => {
    expect(formatFileSize(1)).toBe("1 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  // ── Kilobytes ──
  it("formats exactly 1 KB", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats fractional KB", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats larger KB values", () => {
    expect(formatFileSize(156 * 1024)).toBe("156 KB");
  });

  // ── Megabytes ──
  it("formats exactly 1 MB", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
  });

  it("formats fractional MB", () => {
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe("2.4 MB");
  });

  it("formats exactly 25 MB (soft limit)", () => {
    expect(formatFileSize(25 * 1024 * 1024)).toBe("25 MB");
  });

  // ── Gigabytes ──
  it("formats exactly 1 GB", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
  });

  it("formats fractional GB", () => {
    expect(formatFileSize(1.2 * 1024 * 1024 * 1024)).toBe("1.2 GB");
  });

  // ── Terabytes ──
  it("formats exactly 1 TB", () => {
    expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
  });

  // ── Clean display (no trailing .0) ──
  it("removes trailing .0 for clean display", () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2 MB");
    expect(formatFileSize(10 * 1024)).toBe("10 KB");
  });
});

describe("FILE_SIZE_SOFT_LIMIT", () => {
  it("equals 25 MB in bytes", () => {
    expect(FILE_SIZE_SOFT_LIMIT).toBe(25 * 1024 * 1024);
    expect(FILE_SIZE_SOFT_LIMIT).toBe(26214400);
  });
});

import { describe, expect, it } from "vitest";
import { normalizeDashboardWidgetIds } from "../dashboardWidgetSettings";

describe("normalizeDashboardWidgetIds", () => {
  const allWidgetIds = [
    "current-period-overview",
    "recent-periods",
    "alerts",
    "inactive-categories",
  ];

  it("returns defaults when value is missing", () => {
    expect(normalizeDashboardWidgetIds(null, allWidgetIds)).toEqual(allWidgetIds);
  });

  it("keeps only allowed IDs in registry order", () => {
    const raw = JSON.stringify(["alerts", "current-period-overview"]);
    expect(normalizeDashboardWidgetIds(raw, allWidgetIds)).toEqual([
      "current-period-overview",
      "alerts",
    ]);
  });

  it("dedupes duplicate IDs", () => {
    const raw = JSON.stringify(["alerts", "alerts", "recent-periods"]);
    expect(normalizeDashboardWidgetIds(raw, allWidgetIds)).toEqual([
      "recent-periods",
      "alerts",
    ]);
  });

  it("falls back to defaults when only stale IDs are persisted", () => {
    const raw = JSON.stringify(["retired-widget"]);
    expect(normalizeDashboardWidgetIds(raw, allWidgetIds)).toEqual(allWidgetIds);
  });

  it("allows explicit empty selection", () => {
    const raw = JSON.stringify([]);
    expect(normalizeDashboardWidgetIds(raw, allWidgetIds)).toEqual([]);
  });
});


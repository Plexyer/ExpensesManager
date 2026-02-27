import { getUiSetting, setUiSetting } from "../../../services/settingsService";

export const DASHBOARD_WIDGET_SELECTION_SETTING_KEY = "dashboard_selected_widget_ids";

export const normalizeDashboardWidgetIds = (
  rawValue: string | null,
  allWidgetIds: string[]
): string[] => {
  if (!rawValue) {
    return allWidgetIds;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return allWidgetIds;
    }

    const allowedIds = new Set(allWidgetIds);
    const parsedStringIds = parsed.filter((id): id is string => typeof id === "string");
    const selectedIds = new Set(parsedStringIds.filter((id) => allowedIds.has(id)));
    const normalized = allWidgetIds.filter((id) => selectedIds.has(id));

    // If persisted content contains only stale/invalid IDs, recover to defaults.
    if (parsedStringIds.length > 0 && normalized.length === 0) {
      return allWidgetIds;
    }

    return normalized;
  } catch {
    return allWidgetIds;
  }
};

export const loadDashboardWidgetIds = async (allWidgetIds: string[]): Promise<string[]> => {
  const persisted = await getUiSetting(DASHBOARD_WIDGET_SELECTION_SETTING_KEY);
  return normalizeDashboardWidgetIds(persisted, allWidgetIds);
};

export const saveDashboardWidgetIds = async (widgetIds: string[]): Promise<void> => {
  await setUiSetting(DASHBOARD_WIDGET_SELECTION_SETTING_KEY, JSON.stringify(widgetIds));
};


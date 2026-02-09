import { invoke } from "@tauri-apps/api/core";

/**
 * Gets a UI setting value by key from the database.
 * Returns null if the key does not exist.
 */
export const getUiSetting = async (key: string): Promise<string | null> => {
  return await invoke<string | null>("get_ui_setting", { key });
};

/**
 * Sets a UI setting value by key in the database (upsert).
 */
export const setUiSetting = async (
  key: string,
  value: string
): Promise<void> => {
  await invoke("set_ui_setting", { key, value });
};

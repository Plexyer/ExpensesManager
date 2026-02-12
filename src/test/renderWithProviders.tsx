import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";

/**
 * Custom render that wraps the component with i18n provider.
 * Use this for any component that uses useTranslation().
 */
const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

export { renderWithProviders };

import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "../../i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary that catches React render crashes
 * and displays a user-friendly fallback UI.
 * Uses i18n.t() directly (class components cannot use hooks).
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const t = i18n.t.bind(i18n);

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          {/* Error icon */}
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1 className="text-lg font-semibold text-white mb-2">
            {t("errors.somethingWentWrong")}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            {t("errors.unexpectedError")}
          </p>

          {/* Error details (collapsed) */}
          {this.state.error && (
            <details className="mb-6 text-left">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                {t("errors.technicalDetails")}
              </summary>
              <pre className="mt-2 text-xs text-red-400/70 bg-slate-900/60 border border-slate-700 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleDismiss}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={t("errors.dismissAndContinue")}
            >
              {t("common.dismiss")}
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={t("errors.reloadApplication")}
            >
              {t("errors.reloadApp")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

import { useState, useId } from "react";
import { useTranslation } from "react-i18next";

interface PasswordInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  "aria-describedby"?: string;
}

const PasswordInput = ({
  id: providedId,
  label,
  value,
  onChange,
  error,
  placeholder,
  autoFocus = false,
  disabled = false,
  "aria-describedby": ariaDescribedBy,
}: PasswordInputProps) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = providedId || generatedId;
  const errorId = `${inputId}-error`;

  const handleToggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-300 mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : null, ariaDescribedBy]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`
            w-full px-4 py-3 pr-12 bg-slate-800/50 border rounded-lg
            text-white placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? "border-red-500/50 focus:ring-red-500 focus:border-red-500"
                : "border-slate-700 focus:ring-emerald-500 focus:border-emerald-500/50"
            }
          `}
        />
        <button
          type="button"
          onClick={handleToggleVisibility}
          disabled={disabled}
          aria-label={showPassword ? t("password.hidePassword") : t("password.showPassword")}
          aria-pressed={showPassword}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            p-1 text-slate-400 hover:text-slate-200
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-slate-800
            rounded transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          tabIndex={0}
        >
          {showPassword ? (
            // Eye-off icon
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            // Eye icon
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PasswordInput;

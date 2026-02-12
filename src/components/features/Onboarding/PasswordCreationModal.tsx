import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import PasswordInput from "../../common/PasswordInput";
import {
  getPasswordStrength,
  isStrengthAcceptable,
  type PasswordStrength,
} from "../../../utils/passwordStrength";
import { formatErrorMessage } from "../../../utils/formatErrorMessage";
import {
  validatePassword,
  validatePasswordMatch,
  validateHint,
  getPasswordRequirements,
  MAX_HINT_LENGTH,
} from "../../../utils/passwordValidation";

interface PasswordCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string, hint: string | null) => Promise<void>;
  filePath: string;
}

interface FormState {
  password: string;
  confirmPassword: string;
  hint: string;
}

interface TouchedState {
  password: boolean;
  confirmPassword: boolean;
  hint: boolean;
}

const PasswordCreationModal = ({
  isOpen,
  onClose,
  onSubmit,
  filePath,
}: PasswordCreationModalProps) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>({
    password: "",
    confirmPassword: "",
    hint: "",
  });
  const [touched, setTouched] = useState<TouchedState>({
    password: false,
    confirmPassword: false,
    hint: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Calculate strength on each password change
  const strength: PasswordStrength = getPasswordStrength(form.password);

  // Validations
  const passwordValidation = validatePassword(form.password);
  const matchValidation = validatePasswordMatch(form.password, form.confirmPassword);
  const hintValidation = validateHint(form.hint, form.password);
  const requirements = getPasswordRequirements(form.password);

  // Form validity
  const isFormValid =
    passwordValidation.isValid &&
    matchValidation.isValid &&
    hintValidation.isValid &&
    isStrengthAcceptable(strength.score);

  // Check if form has any data entered
  const hasFormData = form.password || form.confirmPassword || form.hint;

  // Clear form on close
  const clearForm = useCallback(() => {
    setForm({ password: "", confirmPassword: "", hint: "" });
    setTouched({ password: false, confirmPassword: false, hint: false });
    setSubmitError(null);
    setShowDiscardConfirm(false);
  }, []);

  // Handle close with confirmation if data entered
  const handleClose = useCallback(() => {
    if (hasFormData) {
      setShowDiscardConfirm(true);
    } else {
      clearForm();
      onClose();
    }
  }, [hasFormData, clearForm, onClose]);

  // Confirm discard
  const handleConfirmDiscard = () => {
    clearForm();
    onClose();
  };

  // Cancel discard
  const handleCancelDiscard = () => {
    setShowDiscardConfirm(false);
  };

  // NON-NEGOTIABLE: Password creation must never check license or app mode.
  // DB access never requires license — users must always be able to create files.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(form.password, form.hint || null);
      // Clear password from memory after successful submit
      clearForm();
    } catch (error) {
      setSubmitError(formatErrorMessage(error, "Failed to create file"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Focus the first input after a short delay to ensure modal is rendered
      const timer = setTimeout(() => {
        const firstInput = modalRef.current?.querySelector("input");
        firstInput?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Clear form when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearForm();
    }
  }, [isOpen, clearForm]);

  if (!isOpen) {
    return null;
  }

  // Extract filename from path
  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2
              id="password-modal-title"
              className="text-lg font-semibold text-white"
            >
              {t("password.setMasterPassword")}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t("password.closeModal")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body - scrollable when content exceeds viewport */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Warning Banner */}
          <div
            className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg"
            role="alert"
          >
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-400">
                  {t("password.unrecoverable")}
                </p>
                <p className="text-xs text-amber-400/70 mt-1">
                  {t("password.unrecoverableDetail")}
                </p>
              </div>
            </div>
          </div>

          {/* File Info */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-sm text-slate-300 font-mono truncate">
              {fileName}
            </span>
          </div>

          {/* Password Field */}
          <div>
            <PasswordInput
              id="master-password"
              label={t("password.masterPassword")}
              value={form.password}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, password: value }));
                if (!touched.password) {
                  setTouched((prev) => ({ ...prev, password: true }));
                }
              }}
              error={
                touched.password && passwordValidation.errors.length > 0
                  ? passwordValidation.errors[0]
                  : undefined
              }
              placeholder={t("password.enterStrongPassword")}
              autoFocus
              disabled={isSubmitting}
              aria-describedby="password-strength password-requirements"
            />

            {/* Strength Indicator */}
            {form.password && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color} ${strength.barWidth}`}
                    />
                  </div>
                  <span
                    id="password-strength"
                    className={`text-sm font-medium ${
                      strength.score >= 2 ? "text-emerald-400" : "text-red-400"
                    }`}
                    aria-live="polite"
                  >
                    {strength.label}
                  </span>
                </div>

                {/* Requirements Checklist */}
                <ul
                  id="password-requirements"
                  className="space-y-1"
                  aria-label={t("password.passwordRequirements")}
                >
                  {requirements.map((req) => (
                    <li
                      key={req.label}
                      className={`flex items-center gap-2 text-xs ${
                        req.met ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {req.met ? (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      <span>{req.label}</span>
                    </li>
                  ))}
                </ul>

                {/* Strength Warning */}
                {!isStrengthAcceptable(strength.score) && touched.password && (
                  <p className="text-xs text-red-400">
                    {t("password.passwordTooWeak")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <PasswordInput
              id="confirm-password"
              label={t("password.confirmPassword")}
              value={form.confirmPassword}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, confirmPassword: value }));
                if (!touched.confirmPassword) {
                  setTouched((prev) => ({ ...prev, confirmPassword: true }));
                }
              }}
              error={
                touched.confirmPassword && matchValidation.errors.length > 0
                  ? matchValidation.errors[0]
                  : undefined
              }
              placeholder={t("password.reEnterPassword")}
              disabled={isSubmitting}
            />

            {/* Match Indicator */}
            {form.confirmPassword && matchValidation.isValid && (
              <p className="mt-1.5 text-sm text-emerald-400 flex items-center gap-1.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t("password.passwordsMatch")}
              </p>
            )}
          </div>

          {/* Hint Field */}
          <div>
            <label
              htmlFor="password-hint"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              {t("password.passwordHint")}{" "}
              <span className="text-slate-500 font-normal">({t("password.passwordHintOptional")})</span>
            </label>
            <input
              id="password-hint"
              type="text"
              value={form.hint}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, hint: e.target.value }));
                if (!touched.hint) {
                  setTouched((prev) => ({ ...prev, hint: true }));
                }
              }}
              placeholder={t("password.hintPlaceholder")}
              maxLength={MAX_HINT_LENGTH}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:border-emerald-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              {t("password.hintDescription")}
            </p>

            {/* Hint Warnings */}
            {hintValidation.warnings.length > 0 && (
              <p className="mt-1.5 text-xs text-amber-400">
                {hintValidation.warnings[0]}
              </p>
            )}

            {/* Character Count */}
            {form.hint && (
              <p
                className={`mt-1 text-xs text-right ${
                  form.hint.length > MAX_HINT_LENGTH * 0.9
                    ? "text-amber-400"
                    : "text-slate-500"
                }`}
              >
                {form.hint.length}/{MAX_HINT_LENGTH}
              </p>
            )}
          </div>

          {/* Submit Error */}
          {submitError && (
            <div
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              role="alert"
            >
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t("password.creating")}
                </>
              ) : (
                t("password.createFinanceFile")
              )}
            </button>
          </div>
        </form>

        {/* Discard Confirmation Dialog */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95">
            <div className="max-w-sm mx-4 p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-2">
                {t("password.discardPassword")}
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                {t("password.discardPasswordConfirm")}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelDiscard}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {t("password.keepEditing")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {t("password.discard")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordCreationModal;

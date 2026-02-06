import { useState, useEffect, useCallback, useRef } from "react";
import PasswordInput from "../../common/PasswordInput";

const MAX_ATTEMPTS = 5;

interface PasswordUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  filePath: string;
  passwordHint: string | null;
}

const PasswordUnlockModal = ({
  isOpen,
  onClose,
  onSubmit,
  filePath,
  passwordHint,
}: PasswordUnlockModalProps) => {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);

  const isLockedOut = attemptCount >= MAX_ATTEMPTS;
  const remainingAttempts = MAX_ATTEMPTS - attemptCount;

  // Clear form when modal opens
  const clearForm = useCallback(() => {
    setPassword("");
    setError(null);
    // Note: attemptCount is NOT cleared - it persists for the session
  }, []);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || isSubmitting || isLockedOut) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(password);
      // Success - clear form (parent will close modal)
      clearForm();
      setAttemptCount(0); // Reset attempts on success
    } catch (err) {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      if (newAttemptCount >= MAX_ATTEMPTS) {
        setError("Too many failed attempts. Please restart the application to try again.");
      } else {
        // Tauri invoke errors can be strings or Error objects
        const errorMessage = err instanceof Error 
          ? err.message 
          : typeof err === "string" 
            ? err 
            : "Incorrect password. Please try again.";
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear error when password changes (allow retry)
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error && !isLockedOut) {
      setError(null);
    }
  };

  // Handle close
  const handleClose = useCallback(() => {
    clearForm();
    onClose();
  }, [clearForm, onClose]);

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
      const timer = setTimeout(() => {
        const input = modalRef.current?.querySelector("input");
        input?.focus();
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
      aria-labelledby="unlock-modal-title"
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
        className="relative w-full max-w-md max-h-[calc(100vh-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-sky-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2
              id="unlock-modal-title"
              className="text-lg font-semibold text-white"
            >
              Unlock Finance File
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Close modal"
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
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

          {/* Password Hint (if available) */}
          {passwordHint && (
            <div
              className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-lg"
              role="note"
              aria-label="Password hint"
            >
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-sky-400">Password Hint</p>
                  <p className="text-sm text-sky-300/80 mt-1">{passwordHint}</p>
                </div>
              </div>
            </div>
          )}

          {/* Lockout State */}
          {isLockedOut ? (
            <div
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              role="alert"
            >
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
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
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Account Locked
                  </p>
                  <p className="text-xs text-red-400/70 mt-1">
                    Too many failed attempts. Please restart the application to try again.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Password Field */}
              <div>
                <PasswordInput
                  id="unlock-password"
                  label="Master Password"
                  value={password}
                  onChange={handlePasswordChange}
                  error={error || undefined}
                  placeholder="Enter your master password"
                  autoFocus
                  disabled={isSubmitting || isLockedOut}
                />

                {/* Remaining attempts warning */}
                {attemptCount > 0 && !isLockedOut && (
                  <p className="mt-2 text-xs text-amber-400">
                    {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""} remaining
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password || isSubmitting || isLockedOut}
              className="px-5 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  Unlocking...
                </>
              ) : (
                "Unlock"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordUnlockModal;

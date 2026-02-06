import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  createNewFile,
  openExistingFile,
  clearError,
  completeFileCreation,
  cancelPasswordCreation,
  completeFileUnlock,
  cancelFileUnlock,
} from "../../../store/slices/fileSlice";
import PasswordCreationModal from "./PasswordCreationModal";
import PasswordUnlockModal from "./PasswordUnlockModal";
import {
  createStubFile,
  verifyStubPassword,
} from "../../../services/fileService";

const Onboarding = () => {
  const dispatch = useAppDispatch();
  const { isLoading, error, onboardingStep, filePath, passwordHint } = useAppSelector(
    (state) => state.file
  );

  const handleCreateNew = () => {
    dispatch(createNewFile());
  };

  const handleOpenExisting = () => {
    dispatch(openExistingFile());
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  const handlePasswordSubmit = async (
    password: string,
    hint: string | null
  ): Promise<void> => {
    if (!filePath) {
      throw new Error("No file path selected");
    }
    
    // Create the stub file on disk
    // ⚠️ MVP STUB: Password stored in plaintext (will be replaced by SQLCipher)
    await createStubFile(filePath, password, hint);
    
    // Complete the file creation flow
    dispatch(completeFileCreation({ hint }));
  };

  const handlePasswordCancel = () => {
    dispatch(cancelPasswordCreation());
  };

  const handleUnlockSubmit = async (password: string): Promise<void> => {
    if (!filePath) {
      throw new Error("No file path selected");
    }
    
    // Verify password against the stub file
    // ⚠️ MVP STUB: Plaintext password comparison (will be replaced by SQLCipher)
    const fileInfo = await verifyStubPassword(filePath, password);
    
    // Success - complete unlock with hint from file
    dispatch(completeFileUnlock({ hint: fileInfo.password_hint }));
  };

  const handleUnlockCancel = () => {
    dispatch(cancelFileUnlock());
  };

  const isPasswordModalOpen = onboardingStep === "create-password";
  const isUnlockModalOpen = onboardingStep === "unlock-password";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ExpensesManager</h1>
          <p className="text-slate-400">
            Your local-first, encrypted budgeting app
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3"
            role="alert"
          >
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
            <button
              onClick={handleClearError}
              className="text-red-400 hover:text-red-300 transition-colors"
              aria-label="Dismiss error"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Action Cards */}
        <div className="space-y-4">
          {/* Create New File */}
          <button
            onClick={handleCreateNew}
            disabled={isLoading}
            className="w-full p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            type="button"
            aria-label="Create a new finance file"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                {isLoading ? (
                  <svg className="w-6 h-6 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white mb-1">Create New Finance File</h2>
                <p className="text-sm text-slate-400">
                  Start fresh with a new encrypted database for your budgets
                </p>
              </div>
              <svg
                className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Open Existing File */}
          <button
            onClick={handleOpenExisting}
            disabled={isLoading}
            className="w-full p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/50 rounded-xl transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            type="button"
            aria-label="Open an existing finance file"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-sky-500/10 group-hover:bg-sky-500/20 flex items-center justify-center transition-colors">
                {isLoading ? (
                  <svg className="w-6 h-6 text-sky-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white mb-1">Open Finance File</h2>
                <p className="text-sm text-slate-400">
                  Open an existing .financedb file from your computer
                </p>
              </div>
              <svg
                className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition-colors flex-shrink-0 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Your data is stored locally and encrypted with your master password.
            <br />
            No cloud. No tracking. You own your data.
          </p>
        </div>
      </div>

      {/* Password Creation Modal */}
      <PasswordCreationModal
        isOpen={isPasswordModalOpen}
        onClose={handlePasswordCancel}
        onSubmit={handlePasswordSubmit}
        filePath={filePath || ""}
      />

      {/* Password Unlock Modal */}
      <PasswordUnlockModal
        isOpen={isUnlockModalOpen}
        onClose={handleUnlockCancel}
        onSubmit={handleUnlockSubmit}
        filePath={filePath || ""}
        passwordHint={passwordHint}
      />
    </div>
  );
};

export default Onboarding;

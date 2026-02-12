import { useState, useCallback } from "react";
import { useAppSelector } from "../../../store/hooks";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

type CopyState = "idle" | "copied" | "error";

const BACKUP_STEPS = [
  "Close the app (or ensure no writes are in progress).",
  "Navigate to the file location shown below.",
  "Copy the .db file to your backup destination (USB drive, cloud folder, etc.).",
  "To restore, simply open the backed-up file with this app.",
] as const;

const BackupSettings = () => {
  const filePath = useAppSelector((state) => state.file.filePath);
  const fileName = useAppSelector((state) => state.file.fileName);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const handleCopyPath = useCallback(async () => {
    if (!filePath) return;

    try {
      await navigator.clipboard.writeText(filePath);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [filePath]);

  const handleRevealInExplorer = useCallback(async () => {
    if (!filePath) return;

    try {
      await revealItemInDir(filePath);
    } catch (err) {
      console.error("Failed to reveal file in explorer:", err);
    }
  }, [filePath]);

  const copyButtonLabel =
    copyState === "copied"
      ? "Copied!"
      : copyState === "error"
        ? "Copy failed"
        : "Copy path";

  return (
    <section
      aria-labelledby="backup-settings-heading"
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
    >
      <h2
        id="backup-settings-heading"
        className="text-lg font-medium text-white mb-4"
      >
        Backup
      </h2>

      {/* Instructions */}
      <div className="mb-5">
        <p className="text-sm text-slate-300 mb-3">
          Your finance data is stored in a single encrypted file. To back it up,
          simply copy that file to a safe location.
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-400">
          {BACKUP_STEPS.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>

      {/* File Location */}
      <div className="bg-slate-900/60 border border-slate-600/50 rounded-lg p-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Current file location
        </p>

        {filePath ? (
          <>
            {/* File name */}
            <p className="text-sm font-medium text-white mb-1 truncate">
              {fileName ?? filePath.split(/[\\/]/).pop()}
            </p>

            {/* Full path */}
            <p
              className="text-xs text-slate-400 break-all font-mono leading-relaxed mb-3"
              title={filePath}
            >
              {filePath}
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyPath}
                aria-label="Copy file path to clipboard"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  copyState === "copied"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : copyState === "error"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                }`}
              >
                {/* Clipboard icon */}
                {copyState === "copied" ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                )}
                {copyButtonLabel}
              </button>

              <button
                type="button"
                onClick={handleRevealInExplorer}
                aria-label="Show file in file explorer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {/* Folder open icon */}
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
                  />
                </svg>
                Show in Explorer
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500 italic">
            No file currently open.
          </p>
        )}
      </div>

      {/* Tip */}
      <div className="mt-4 flex gap-2 text-xs text-slate-500">
        <svg
          className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p>
          The file is encrypted with your master password. Anyone with the file
          still needs the password to open it.
        </p>
      </div>
    </section>
  );
};

export default BackupSettings;

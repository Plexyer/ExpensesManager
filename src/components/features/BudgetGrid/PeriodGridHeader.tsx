import { useCallback, useRef } from "react";
import {
  COLUMN_CONFIG,
  LAST_FROZEN_COL_INDEX,
  MIN_COLUMN_WIDTH,
  computeStickyLeft,
} from "./types";
import type { GridColumnId, ColumnWidths, OptimalWidths, SnapMode } from "./types";

interface PeriodGridHeaderProps {
  columnWidths: ColumnWidths;
  optimalWidths: OptimalWidths;
  snapMode: SnapMode;
  onColumnResize: (columnId: GridColumnId, width: number) => void;
  onColumnResizeBatch: (updates: Partial<Record<GridColumnId, number>>) => void;
  onResizeEnd: (updatedWidths: ColumnWidths) => void;
}

/** Magnetic snap threshold in pixels. */
const MAGNETIC_THRESHOLD = 8;
/** Hard detent snap threshold — additional drag needed to break free. */
const DETENT_BREAK_THRESHOLD = 12;

/**
 * Apply snap-to-content logic to a column width during resize.
 * Returns the potentially snapped width.
 */
const applySnap = (
  rawWidth: number,
  optimalWidth: number | undefined,
  snapMode: SnapMode
): number => {
  if (optimalWidth === undefined) return rawWidth;

  if (snapMode === "magnetic") {
    // Pull toward optimal width when within threshold
    if (Math.abs(rawWidth - optimalWidth) < MAGNETIC_THRESHOLD) {
      return optimalWidth;
    }
  }
  // "detent" mode is handled in the drag state machine (see handleResizeMouseDown)
  return rawWidth;
};

const PeriodGridHeader = ({
  columnWidths,
  optimalWidths,
  snapMode,
  onColumnResize,
  onColumnResizeBatch,
  onResizeEnd,
}: PeriodGridHeaderProps) => {
  /** Ref to track the latest columnWidths during drag (avoids stale closure). */
  const widthsRef = useRef(columnWidths);
  widthsRef.current = columnWidths;

  /**
   * Determines the resize behavior for a handle at a given column index.
   *
   * Handle positions (from COLUMN_RESIZE_SPEC):
   * - Right edge of col 0 (Category, frozen) → NO HANDLE (both cols frozen)
   * - Right edge of col 1 (Received Date, frozen) → Single-column resize (only Received Amount)
   * - Right edge of col 2 (Received Amount) → Paired resize (Received Amount + Spent Amount)
   * - Right edge of col 3 (Spent Amount) → Paired resize (Spent Amount + Remaining)
   * - Right edge of col 4 (Remaining, last) → NO HANDLE (no right neighbor)
   */
  const getResizeBehavior = (
    colIndex: number
  ): {
    type: "none" | "single" | "paired";
    leftColId?: GridColumnId;
    rightColId?: GridColumnId;
  } => {
    const col = COLUMN_CONFIG[colIndex];
    const nextCol = COLUMN_CONFIG[colIndex + 1];

    // No handle if this is the last column (no right neighbor)
    if (!nextCol) return { type: "none" };

    // No handle if both this column and next are frozen
    if (col.frozen && nextCol.frozen) return { type: "none" };

    // Frozen-to-resizable boundary: single-column resize on the resizable column
    if (col.frozen && !nextCol.frozen) {
      return { type: "single", rightColId: nextCol.id };
    }

    // Both resizable: paired resize
    return { type: "paired", leftColId: col.id, rightColId: nextCol.id };
  };

  /** Start drag-to-resize for a column handle. */
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      const behavior = getResizeBehavior(colIndex);
      if (behavior.type === "none") return;

      const startX = e.clientX;

      // For hard detent: track whether we're currently snapped
      let leftSnapped = false;
      let rightSnapped = false;
      let leftSnapBreakX = 0;
      let rightSnapBreakX = 0;

      if (behavior.type === "single" && behavior.rightColId) {
        // Single-column resize: only adjust the right (resizable) column
        const rightId = behavior.rightColId;
        const startRightWidth = widthsRef.current[rightId];
        const rightOptimal = optimalWidths[rightId];

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const delta = moveEvent.clientX - startX;
          // For the frozen→resizable boundary:
          // drag LEFT = shrink resizable; drag RIGHT = grow resizable
          let newRightWidth = Math.max(startRightWidth + delta, MIN_COLUMN_WIDTH);

          // Apply snap logic
          if (snapMode === "detent" && rightOptimal !== undefined) {
            if (rightSnapped) {
              // Currently snapped — check if we should break free
              if (Math.abs(moveEvent.clientX - rightSnapBreakX) > DETENT_BREAK_THRESHOLD) {
                rightSnapped = false;
              } else {
                newRightWidth = rightOptimal;
              }
            } else {
              // Check if we should snap
              const rawWidth = startRightWidth + delta;
              if (Math.abs(rawWidth - rightOptimal) < MAGNETIC_THRESHOLD) {
                rightSnapped = true;
                rightSnapBreakX = moveEvent.clientX;
                newRightWidth = rightOptimal;
              }
            }
          } else {
            newRightWidth = applySnap(newRightWidth, rightOptimal, snapMode);
          }

          onColumnResize(rightId, newRightWidth);
        };

        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          onResizeEnd(widthsRef.current);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        return;
      }

      if (behavior.type === "paired" && behavior.leftColId && behavior.rightColId) {
        // Paired resize: both columns adjust, zero-sum
        const leftId = behavior.leftColId;
        const rightId = behavior.rightColId;
        const startLeftWidth = widthsRef.current[leftId];
        const startRightWidth = widthsRef.current[rightId];
        const totalWidth = startLeftWidth + startRightWidth;
        const leftOptimal = optimalWidths[leftId];
        const rightOptimal = optimalWidths[rightId];

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const delta = moveEvent.clientX - startX;

          // Clamp: left column between MIN and (total - MIN)
          let newLeftWidth = Math.max(
            Math.min(startLeftWidth + delta, totalWidth - MIN_COLUMN_WIDTH),
            MIN_COLUMN_WIDTH
          );
          let newRightWidth = totalWidth - newLeftWidth;

          // Apply snap logic to the left column
          if (snapMode === "detent" && leftOptimal !== undefined) {
            if (leftSnapped) {
              if (Math.abs(moveEvent.clientX - leftSnapBreakX) > DETENT_BREAK_THRESHOLD) {
                leftSnapped = false;
              } else {
                newLeftWidth = leftOptimal;
                newRightWidth = totalWidth - newLeftWidth;
              }
            } else {
              if (Math.abs(newLeftWidth - leftOptimal) < MAGNETIC_THRESHOLD) {
                leftSnapped = true;
                leftSnapBreakX = moveEvent.clientX;
                newLeftWidth = leftOptimal;
                newRightWidth = totalWidth - newLeftWidth;
              }
            }
          } else {
            const snappedLeft = applySnap(newLeftWidth, leftOptimal, snapMode);
            if (snappedLeft !== newLeftWidth) {
              newLeftWidth = snappedLeft;
              newRightWidth = totalWidth - newLeftWidth;
            }
          }

          // Apply snap logic to the right column (if left didn't snap)
          if (!leftSnapped) {
            if (snapMode === "detent" && rightOptimal !== undefined) {
              if (rightSnapped) {
                if (Math.abs(moveEvent.clientX - rightSnapBreakX) > DETENT_BREAK_THRESHOLD) {
                  rightSnapped = false;
                } else {
                  newRightWidth = rightOptimal;
                  newLeftWidth = totalWidth - newRightWidth;
                }
              } else {
                if (Math.abs(newRightWidth - rightOptimal) < MAGNETIC_THRESHOLD) {
                  rightSnapped = true;
                  rightSnapBreakX = moveEvent.clientX;
                  newRightWidth = rightOptimal;
                  newLeftWidth = totalWidth - newRightWidth;
                }
              }
            } else {
              const snappedRight = applySnap(newRightWidth, rightOptimal, snapMode);
              if (snappedRight !== newRightWidth) {
                newRightWidth = snappedRight;
                newLeftWidth = totalWidth - newRightWidth;
              }
            }
          }

          // Final clamp to ensure min widths
          newLeftWidth = Math.max(newLeftWidth, MIN_COLUMN_WIDTH);
          newRightWidth = Math.max(newRightWidth, MIN_COLUMN_WIDTH);

          onColumnResizeBatch({ [leftId]: newLeftWidth, [rightId]: newRightWidth });
        };

        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          onResizeEnd(widthsRef.current);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }
    },
    [onColumnResize, onColumnResizeBatch, onResizeEnd, optimalWidths, snapMode]
  );

  /** Keyboard resize support: ArrowLeft/ArrowRight adjust width by 10px. */
  const handleResizeKeyDown = useCallback(
    (e: React.KeyboardEvent, colIndex: number) => {
      const behavior = getResizeBehavior(colIndex);
      if (behavior.type === "none") return;

      const step = 10;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();

      const direction = e.key === "ArrowRight" ? 1 : -1;

      if (behavior.type === "single" && behavior.rightColId) {
        const rightId = behavior.rightColId;
        const newWidth = Math.max(
          widthsRef.current[rightId] + step * direction,
          MIN_COLUMN_WIDTH
        );
        onColumnResize(rightId, newWidth);
        onResizeEnd({ ...widthsRef.current, [rightId]: newWidth });
        return;
      }

      if (behavior.type === "paired" && behavior.leftColId && behavior.rightColId) {
        const leftId = behavior.leftColId;
        const rightId = behavior.rightColId;
        const totalWidth = widthsRef.current[leftId] + widthsRef.current[rightId];
        const newLeftWidth = Math.max(
          Math.min(widthsRef.current[leftId] + step * direction, totalWidth - MIN_COLUMN_WIDTH),
          MIN_COLUMN_WIDTH
        );
        const newRightWidth = totalWidth - newLeftWidth;
        const updated = {
          ...widthsRef.current,
          [leftId]: newLeftWidth,
          [rightId]: newRightWidth,
        };
        onColumnResizeBatch({ [leftId]: newLeftWidth, [rightId]: newRightWidth });
        onResizeEnd(updated);
      }
    },
    [onColumnResize, onColumnResizeBatch, onResizeEnd]
  );

  /**
   * Determines whether to render a resize handle for a given column index.
   * Returns true if the handle should exist.
   */
  const shouldShowHandle = (colIndex: number): boolean => {
    return getResizeBehavior(colIndex).type !== "none";
  };

  return (
    <thead>
      <tr>
        {COLUMN_CONFIG.map((col, colIndex) => {
          const isFrozen = col.frozen;
          const isLastFrozen = colIndex === LAST_FROZEN_COL_INDEX;
          const isLastColumn = colIndex === COLUMN_CONFIG.length - 1;
          const width = columnWidths[col.id];
          const stickyLeft = isFrozen
            ? computeStickyLeft(colIndex, columnWidths)
            : 0;

          // Frozen header cells stick both vertically (top) and horizontally (left).
          // Non-frozen header cells only stick vertically.
          const zClass = isFrozen ? "z-30" : "z-20";
          const shadowClass = isLastFrozen
            ? "shadow-[2px_0_4px_rgba(0,0,0,0.15)]"
            : "";
          const separatorClass = isLastColumn
            ? ""
            : "border-r border-slate-600/40";
          const showHandle = shouldShowHandle(colIndex);

          return (
            <th
              key={col.id}
              scope="col"
              className={`relative sticky top-0 ${zClass} ${shadowClass} bg-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 border-slate-600 ${separatorClass} ${
                col.align === "right" ? "text-right" : "text-left"
              } text-slate-400 select-none`}
              style={{
                width,
                minWidth: width,
                ...(isFrozen ? { left: stickyLeft } : {}),
              }}
            >
              {col.label}

              {/* Resize handle — only shown where resize is allowed */}
              {showHandle && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize column border`}
                  tabIndex={0}
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/60 active:bg-blue-500/80 transition-colors"
                  onMouseDown={(e) => handleResizeMouseDown(e, colIndex)}
                  onKeyDown={(e) => handleResizeKeyDown(e, colIndex)}
                />
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

export default PeriodGridHeader;

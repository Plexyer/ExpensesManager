import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAttachmentUpload } from "../useAttachmentUpload";
import { FILE_SIZE_SOFT_LIMIT } from "../../utils/formatFileSize";
import type { AttachmentMeta, FileMetaInfo } from "../../types/attachment.types";

// ── Mock the service module (not invoke) for cleaner hook tests ──

vi.mock("../../services/attachmentService", () => ({
  pickAttachmentFiles: vi.fn(),
  getFileSizes: vi.fn(),
  addAttachment: vi.fn(),
}));

import {
  pickAttachmentFiles,
  getFileSizes,
  addAttachment,
} from "../../services/attachmentService";

const mockPickFiles = vi.mocked(pickAttachmentFiles);
const mockGetFileSizes = vi.mocked(getFileSizes);
const mockAddAttachment = vi.mocked(addAttachment);

// ── Helpers ──

const LINE_ITEM_ID = 42;

const makeFileMeta = (
  overrides: Partial<FileMetaInfo> = {}
): FileMetaInfo => ({
  path: "/path/to/file.jpg",
  file_name: "file.jpg",
  file_size: 1024,
  ...overrides,
});

const makeAttachment = (
  overrides: Partial<AttachmentMeta> = {}
): AttachmentMeta => ({
  attachment_id: 1,
  line_item_id: LINE_ITEM_ID,
  file_name: "file.jpg",
  mime_type: "image/jpeg",
  file_size: 1024,
  thumbnail: null,
  created_at: "2026-02-13T10:00:00Z",
  ...overrides,
});

// ── Setup ──

beforeEach(() => {
  mockPickFiles.mockReset();
  mockGetFileSizes.mockReset();
  mockAddAttachment.mockReset();
});

// ── Tests ──

describe("useAttachmentUpload — Initial state", () => {
  it("starts with isUploading=false and no warning", () => {
    const { result } = renderHook(() => useAttachmentUpload(LINE_ITEM_ID));

    expect(result.current.isUploading).toBe(false);
    expect(result.current.currentWarning).toBeNull();
  });
});

describe("useAttachmentUpload — File picker cancellation", () => {
  it("does nothing when file picker is cancelled (null)", async () => {
    mockPickFiles.mockResolvedValueOnce(null);
    const onComplete = vi.fn();

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    expect(result.current.isUploading).toBe(false);
    expect(mockGetFileSizes).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("does nothing when file picker returns empty array", async () => {
    mockPickFiles.mockResolvedValueOnce([]);
    const onComplete = vi.fn();

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    expect(mockGetFileSizes).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe("useAttachmentUpload — Successful uploads", () => {
  it("uploads a single small file end-to-end", async () => {
    const fileMeta = makeFileMeta();
    const attachment = makeAttachment();
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/to/file.jpg"]);
    mockGetFileSizes.mockResolvedValueOnce([fileMeta]);
    mockAddAttachment.mockResolvedValueOnce(attachment);

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    expect(mockGetFileSizes).toHaveBeenCalledWith(["/path/to/file.jpg"]);
    expect(mockAddAttachment).toHaveBeenCalledWith(
      LINE_ITEM_ID,
      "/path/to/file.jpg"
    );
    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [attachment],
      skipped: [],
      errors: [],
    });
    expect(result.current.isUploading).toBe(false);
  });

  it("uploads multiple small files", async () => {
    const fileMeta1 = makeFileMeta({
      path: "/path/a.jpg",
      file_name: "a.jpg",
    });
    const fileMeta2 = makeFileMeta({
      path: "/path/b.pdf",
      file_name: "b.pdf",
      file_size: 2048,
    });
    const att1 = makeAttachment({ attachment_id: 1, file_name: "a.jpg" });
    const att2 = makeAttachment({
      attachment_id: 2,
      file_name: "b.pdf",
      mime_type: "application/pdf",
    });
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/a.jpg", "/path/b.pdf"]);
    mockGetFileSizes.mockResolvedValueOnce([fileMeta1, fileMeta2]);
    mockAddAttachment
      .mockResolvedValueOnce(att1)
      .mockResolvedValueOnce(att2);

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    expect(mockAddAttachment).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [att1, att2],
      skipped: [],
      errors: [],
    });
  });
});

describe("useAttachmentUpload — File size warnings", () => {
  it("shows warning for file > 25 MB, uploads when confirmed", async () => {
    const largeFile = makeFileMeta({
      path: "/path/large.pdf",
      file_name: "large.pdf",
      file_size: FILE_SIZE_SOFT_LIMIT + 1,
    });
    const attachment = makeAttachment({
      file_name: "large.pdf",
      file_size: FILE_SIZE_SOFT_LIMIT + 1,
    });
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/large.pdf"]);
    mockGetFileSizes.mockResolvedValueOnce([largeFile]);
    mockAddAttachment.mockResolvedValueOnce(attachment);

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    // Start upload in background (warning will pause it)
    let uploadPromise: Promise<unknown>;
    act(() => {
      uploadPromise = result.current.handlePickAndUpload() as Promise<unknown>;
    });

    // Wait for warning to appear
    await waitFor(() => {
      expect(result.current.currentWarning).not.toBeNull();
    });

    expect(result.current.currentWarning?.file).toEqual(largeFile);
    expect(mockAddAttachment).not.toHaveBeenCalled();

    // Confirm the warning
    act(() => {
      result.current.handleWarningConfirm();
    });

    await act(async () => {
      await uploadPromise!;
    });

    expect(mockAddAttachment).toHaveBeenCalledWith(
      LINE_ITEM_ID,
      "/path/large.pdf"
    );
    expect(result.current.currentWarning).toBeNull();
    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [attachment],
      skipped: [],
      errors: [],
    });
  });

  it("skips file when warning is cancelled", async () => {
    const largeFile = makeFileMeta({
      path: "/path/large.pdf",
      file_name: "large.pdf",
      file_size: FILE_SIZE_SOFT_LIMIT + 1,
    });
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/large.pdf"]);
    mockGetFileSizes.mockResolvedValueOnce([largeFile]);

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    let uploadPromise: Promise<unknown>;
    act(() => {
      uploadPromise = result.current.handlePickAndUpload() as Promise<unknown>;
    });

    await waitFor(() => {
      expect(result.current.currentWarning).not.toBeNull();
    });

    // Cancel the warning
    act(() => {
      result.current.handleWarningCancel();
    });

    await act(async () => {
      await uploadPromise!;
    });

    expect(mockAddAttachment).not.toHaveBeenCalled();
    expect(result.current.currentWarning).toBeNull();
    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [],
      skipped: ["large.pdf"],
      errors: [],
    });
  });

  it("does NOT show warning for file exactly at 25 MB limit", async () => {
    const fileMeta = makeFileMeta({
      file_size: FILE_SIZE_SOFT_LIMIT,
    });
    const attachment = makeAttachment();
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/to/file.jpg"]);
    mockGetFileSizes.mockResolvedValueOnce([fileMeta]);
    mockAddAttachment.mockResolvedValueOnce(attachment);

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    // No warning was shown — uploaded directly
    expect(result.current.currentWarning).toBeNull();
    expect(mockAddAttachment).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [attachment],
      skipped: [],
      errors: [],
    });
  });
});

describe("useAttachmentUpload — Error handling", () => {
  it("handles getFileSizes failure gracefully", async () => {
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/to/file.jpg"]);
    mockGetFileSizes.mockRejectedValueOnce(new Error("Stat failed"));

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [],
      skipped: [],
      errors: [{ fileName: "(file metadata)", error: "Stat failed" }],
    });
    expect(result.current.isUploading).toBe(false);
  });

  it("handles addAttachment failure for a single file", async () => {
    const fileMeta = makeFileMeta();
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/to/file.jpg"]);
    mockGetFileSizes.mockResolvedValueOnce([fileMeta]);
    mockAddAttachment.mockRejectedValueOnce(new Error("DB write failed"));

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [],
      skipped: [],
      errors: [{ fileName: "file.jpg", error: "DB write failed" }],
    });
  });

  it("handles partial errors in batch upload (first succeeds, second fails)", async () => {
    const fileMeta1 = makeFileMeta({
      path: "/path/a.jpg",
      file_name: "a.jpg",
    });
    const fileMeta2 = makeFileMeta({
      path: "/path/b.pdf",
      file_name: "b.pdf",
    });
    const att1 = makeAttachment({ attachment_id: 1, file_name: "a.jpg" });
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/a.jpg", "/path/b.pdf"]);
    mockGetFileSizes.mockResolvedValueOnce([fileMeta1, fileMeta2]);
    mockAddAttachment
      .mockResolvedValueOnce(att1)
      .mockRejectedValueOnce(new Error("Upload failed"));

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [att1],
      skipped: [],
      errors: [{ fileName: "b.pdf", error: "Upload failed" }],
    });
  });

  it("handles non-Error rejection (string error)", async () => {
    const fileMeta = makeFileMeta();
    const onComplete = vi.fn();

    mockPickFiles.mockResolvedValueOnce(["/path/to/file.jpg"]);
    mockGetFileSizes.mockResolvedValueOnce([fileMeta]);
    mockAddAttachment.mockRejectedValueOnce("Raw string error");

    const { result } = renderHook(() =>
      useAttachmentUpload(LINE_ITEM_ID, onComplete)
    );

    await act(async () => {
      await result.current.handlePickAndUpload();
    });

    expect(onComplete).toHaveBeenCalledWith({
      uploaded: [],
      skipped: [],
      errors: [{ fileName: "file.jpg", error: "Raw string error" }],
    });
  });
});

describe("useAttachmentUpload — State management", () => {
  it("sets isUploading=true during the upload process", async () => {
    let resolveGetFileSizes: (value: FileMetaInfo[]) => void;
    const pendingPromise = new Promise<FileMetaInfo[]>((resolve) => {
      resolveGetFileSizes = resolve;
    });

    mockPickFiles.mockResolvedValueOnce(["/path/to/file.jpg"]);
    mockGetFileSizes.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useAttachmentUpload(LINE_ITEM_ID));

    // Start upload but don't await
    let uploadPromise: Promise<unknown>;
    act(() => {
      uploadPromise = result.current.handlePickAndUpload() as Promise<unknown>;
    });

    // Should be uploading now
    await waitFor(() => {
      expect(result.current.isUploading).toBe(true);
    });

    // Resolve the pending promise to finish up
    mockAddAttachment.mockResolvedValueOnce(makeAttachment());
    await act(async () => {
      resolveGetFileSizes!([makeFileMeta()]);
      await uploadPromise!;
    });

    expect(result.current.isUploading).toBe(false);
  });
});

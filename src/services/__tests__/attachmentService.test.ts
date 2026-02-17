import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  pickAttachmentFiles,
  pickExportPath,
  getFileSizes,
  addAttachment,
  listAttachments,
  getAttachmentSummaries,
  getAttachmentCounts,
  deleteAttachment,
  exportAttachment,
  getAttachmentData,
} from "../attachmentService";
import type {
  AttachmentMeta,
  AttachmentSummary,
  FileMetaInfo,
} from "../../types/attachment.types";

// ── Module mocks ──

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

// ── Helpers ──

const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);
const mockSave = vi.mocked(save);

const MOCK_ATTACHMENT: AttachmentMeta = {
  attachment_id: 1,
  line_item_id: 42,
  file_name: "receipt.jpg",
  mime_type: "image/jpeg",
  file_size: 1024,
  thumbnail: "data:image/jpeg;base64,/9j/test",
  created_at: "2026-02-13T10:00:00Z",
};

// ── Tests ──

beforeEach(() => {
  mockInvoke.mockReset();
  mockOpen.mockReset();
  mockSave.mockReset();
});

describe("pickAttachmentFiles", () => {
  it("returns array of paths when files are selected", async () => {
    mockOpen.mockResolvedValueOnce(["/path/to/a.jpg", "/path/to/b.pdf"] as never);

    const result = await pickAttachmentFiles();

    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Select Files to Attach",
        multiple: true,
        directory: false,
        filters: expect.arrayContaining([
          expect.objectContaining({ name: "Images" }),
          expect.objectContaining({ name: "Documents" }),
          expect.objectContaining({ name: "All Files" }),
        ]),
      })
    );
    expect(result).toEqual(["/path/to/a.jpg", "/path/to/b.pdf"]);
  });

  it("normalizes a single file path to an array", async () => {
    mockOpen.mockResolvedValueOnce("/single/file.jpg" as never);

    const result = await pickAttachmentFiles();

    expect(result).toEqual(["/single/file.jpg"]);
  });

  it("returns null when user cancels the dialog", async () => {
    mockOpen.mockResolvedValueOnce(null as never);

    const result = await pickAttachmentFiles();

    expect(result).toBeNull();
  });
});

describe("pickExportPath", () => {
  it("returns the chosen save path", async () => {
    mockSave.mockResolvedValueOnce("/save/to/receipt.pdf" as never);

    const result = await pickExportPath("receipt.pdf");

    expect(mockSave).toHaveBeenCalledWith({
      title: "Save Attachment",
      defaultPath: "receipt.pdf",
    });
    expect(result).toBe("/save/to/receipt.pdf");
  });

  it("returns null when user cancels save dialog", async () => {
    mockSave.mockResolvedValueOnce(null as never);

    const result = await pickExportPath("file.pdf");

    expect(result).toBeNull();
  });
});

describe("getFileSizes", () => {
  it("calls invoke with correct command and parameters", async () => {
    const mockMetas: FileMetaInfo[] = [
      { path: "/p/a.jpg", file_name: "a.jpg", file_size: 1024 },
      { path: "/p/b.pdf", file_name: "b.pdf", file_size: 2048 },
    ];
    mockInvoke.mockResolvedValueOnce(mockMetas);

    const result = await getFileSizes(["/p/a.jpg", "/p/b.pdf"]);

    expect(mockInvoke).toHaveBeenCalledWith("get_file_sizes", {
      paths: ["/p/a.jpg", "/p/b.pdf"],
    });
    expect(result).toEqual(mockMetas);
  });

  it("propagates errors from the backend", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("File not found"));

    await expect(getFileSizes(["/invalid"])).rejects.toThrow("File not found");
  });
});

describe("addAttachment", () => {
  it("calls invoke with correct command and parameters", async () => {
    mockInvoke.mockResolvedValueOnce(MOCK_ATTACHMENT);

    const result = await addAttachment(42, "/path/to/receipt.jpg");

    expect(mockInvoke).toHaveBeenCalledWith("add_attachment", {
      lineItemId: 42,
      filePath: "/path/to/receipt.jpg",
    });
    expect(result).toEqual(MOCK_ATTACHMENT);
  });

  it("propagates errors for invalid line item", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Line item not found"));

    await expect(addAttachment(999, "/path")).rejects.toThrow(
      "Line item not found"
    );
  });
});

describe("listAttachments", () => {
  it("calls invoke with correct command and returns metadata array", async () => {
    mockInvoke.mockResolvedValueOnce([MOCK_ATTACHMENT]);

    const result = await listAttachments(42);

    expect(mockInvoke).toHaveBeenCalledWith("list_attachments", {
      lineItemId: 42,
    });
    expect(result).toEqual([MOCK_ATTACHMENT]);
  });

  it("returns empty array when no attachments exist", async () => {
    mockInvoke.mockResolvedValueOnce([]);

    const result = await listAttachments(42);

    expect(result).toEqual([]);
  });
});

describe("getAttachmentSummaries", () => {
  it("calls invoke with correct command and returns record", async () => {
    const mockSummaries: Record<string, AttachmentSummary> = {
      "1": {
        count: 2,
        first_thumbnail: "data:image/jpeg;base64,thumb",
        first_mime_type: "image/jpeg",
      },
      "2": { count: 1, first_thumbnail: null, first_mime_type: "application/pdf" },
    };
    mockInvoke.mockResolvedValueOnce(mockSummaries);

    const result = await getAttachmentSummaries([1, 2]);

    expect(mockInvoke).toHaveBeenCalledWith("get_attachment_summaries", {
      lineItemIds: [1, 2],
    });
    expect(result).toEqual(mockSummaries);
  });
});

describe("getAttachmentCounts", () => {
  it("calls invoke with correct command and returns counts", async () => {
    const mockCounts = { "42": 3, "43": 1 };
    mockInvoke.mockResolvedValueOnce(mockCounts);

    const result = await getAttachmentCounts([42, 43]);

    expect(mockInvoke).toHaveBeenCalledWith("get_attachment_counts", {
      lineItemIds: [42, 43],
    });
    expect(result).toEqual(mockCounts);
  });
});

describe("deleteAttachment", () => {
  it("calls invoke with correct command and attachment id", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await deleteAttachment(123);

    expect(mockInvoke).toHaveBeenCalledWith("delete_attachment", {
      attachmentId: 123,
    });
  });

  it("propagates errors for already-deleted attachment", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Attachment already deleted"));

    await expect(deleteAttachment(123)).rejects.toThrow(
      "Attachment already deleted"
    );
  });
});

describe("exportAttachment", () => {
  it("calls invoke with correct command and parameters", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await exportAttachment(123, "/save/path/receipt.jpg");

    expect(mockInvoke).toHaveBeenCalledWith("export_attachment", {
      attachmentId: 123,
      savePath: "/save/path/receipt.jpg",
    });
  });

  it("propagates errors for write failure", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Permission denied"));

    await expect(exportAttachment(123, "/readonly")).rejects.toThrow(
      "Permission denied"
    );
  });
});

describe("getAttachmentData", () => {
  it("calls invoke with correct command and returns base64 data URL", async () => {
    const dataUrl = "data:image/jpeg;base64,/9j/fullData";
    mockInvoke.mockResolvedValueOnce(dataUrl);

    const result = await getAttachmentData(123);

    expect(mockInvoke).toHaveBeenCalledWith("get_attachment_data", {
      attachmentId: 123,
    });
    expect(result).toBe(dataUrl);
  });

  it("propagates errors for not-found attachment", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Attachment not found"));

    await expect(getAttachmentData(999)).rejects.toThrow(
      "Attachment not found"
    );
  });
});

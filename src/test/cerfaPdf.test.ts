import { beforeEach, describe, expect, it, vi } from "vitest";

const shareMock = vi.fn();
const shareTextMock = vi.fn();
const isNativePlatformMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const writeFileMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@capacitor/share", () => ({
  Share: { share: shareMock },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: writeFileMock },
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));

vi.mock("@/lib/capacitorPush", () => ({
  isNativePlatform: isNativePlatformMock,
}));

vi.mock("@/lib/shareUtils", () => ({
  shareText: shareTextMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe("shareCerfaPdf", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isNativePlatformMock.mockReturnValue(false);
    shareTextMock.mockResolvedValue(true);
    shareMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue({ uri: "file:///cache/cerfa-abc.pdf" });
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: "application/pdf" }),
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it("partage le PDF en fichier via le sheet natif iOS", async () => {
    isNativePlatformMock.mockReturnValue(true);
    const { shareCerfaPdf } = await import("@/lib/cerfaPdf");

    const token = "abc12345-rest";
    await expect(shareCerfaPdf(token)).resolves.toBe(true);

    expect(writeFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "cerfa-abc12345.pdf",
        directory: "CACHE",
      }),
    );
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Reçu CERFA",
        url: "file:///cache/cerfa-abc.pdf",
      }),
    );
    expect(shareTextMock).not.toHaveBeenCalled();
  });

  it("partage le PDF en fichier via Web Share API quand canShare l'autorise", async () => {
    const navigatorShare = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      writable: true,
      value: navigatorShare,
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      writable: true,
      value: canShare,
    });

    const { shareCerfaPdf } = await import("@/lib/cerfaPdf");
    const token = "web-123";

    await expect(shareCerfaPdf(token)).resolves.toBe(true);

    expect(canShare).toHaveBeenCalled();
    expect(navigatorShare).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Reçu CERFA" }),
    );
    const callArg = navigatorShare.mock.calls[0][0];
    expect(callArg.files?.[0]).toBeInstanceOf(File);
    expect(shareTextMock).not.toHaveBeenCalled();
  });

  it("retombe sur la copie du lien sur desktop web", async () => {
    const { shareCerfaPdf, getCerfaPdfUrl } = await import("@/lib/cerfaPdf");
    const token = "desktop-123";

    await expect(shareCerfaPdf(token)).resolves.toBe(true);

    expect(shareTextMock).toHaveBeenCalledWith(getCerfaPdfUrl(token), "Reçu CERFA");
    expect(toastSuccessMock).toHaveBeenCalledWith("Lien du CERFA prêt à être envoyé.");
  });
});
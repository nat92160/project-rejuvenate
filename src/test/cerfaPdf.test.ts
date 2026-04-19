import { beforeEach, describe, expect, it, vi } from "vitest";

const shareMock = vi.fn();
const shareTextMock = vi.fn();
const isNativePlatformMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@capacitor/share", () => ({
  Share: { share: shareMock },
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
    Object.defineProperty(navigator, "share", {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it("utilise le partage natif dans l'app avec l'URL publique du PDF", async () => {
    isNativePlatformMock.mockReturnValue(true);
    const { shareCerfaPdf, getCerfaPdfUrl } = await import("@/lib/cerfaPdf");

    const token = "abc-123";
    await expect(shareCerfaPdf(token)).resolves.toBe(true);

    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Reçu CERFA",
        url: getCerfaPdfUrl(token),
      }),
    );
    expect(shareTextMock).not.toHaveBeenCalled();
  });

  it("utilise navigator.share sur le web sans blob bloqué", async () => {
    const navigatorShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      writable: true,
      value: navigatorShare,
    });

    const { shareCerfaPdf, getCerfaPdfUrl } = await import("@/lib/cerfaPdf");
    const token = "web-123";

    await expect(shareCerfaPdf(token)).resolves.toBe(true);

    expect(navigatorShare).toHaveBeenCalledWith(
      expect.objectContaining({
        url: getCerfaPdfUrl(token),
      }),
    );
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
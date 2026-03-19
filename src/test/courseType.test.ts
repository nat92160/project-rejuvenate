import { describe, expect, it } from "vitest";
import { normalizeCourseType } from "@/lib/courseType";

describe("normalizeCourseType", () => {
  it("retourne presentiel quand le type est explicitement presentiel", () => {
    expect(normalizeCourseType("presentiel", "", "12 rue de la Paix")).toBe("presentiel");
  });

  it("corrige les anciens cours marqués zoom mais avec une adresse", () => {
    expect(normalizeCourseType("zoom", "", "12 rue de la Paix")).toBe("presentiel");
  });

  it("garde zoom quand un lien Zoom existe", () => {
    expect(normalizeCourseType("zoom", "https://zoom.us/j/123", "")).toBe("zoom");
  });
});

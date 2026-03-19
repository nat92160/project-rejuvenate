export type CourseType = "zoom" | "presentiel";

export const normalizeCourseType = (
  courseType?: string | null,
  zoomLink?: string | null,
  address?: string | null
): CourseType => {
  const normalized = (courseType ?? "").trim().toLowerCase();
  const hasZoomLink = Boolean(zoomLink?.trim());
  const hasAddress = Boolean(address?.trim());

  if (normalized === "presentiel") return "presentiel";
  if (normalized === "zoom") return hasAddress && !hasZoomLink ? "presentiel" : "zoom";
  if (hasAddress && !hasZoomLink) return "presentiel";

  return "zoom";
};

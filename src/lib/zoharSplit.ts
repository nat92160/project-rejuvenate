import type { ZoharSection } from "./zohar-brit-data";
import { sectionWeight } from "./zohar-brit-data";

/**
 * Découpe équitable par sections complètes (jamais coupées).
 * Algo greedy : on trie les sections par poids décroissant et on les attribue
 * au participant le moins chargé. Garantit le meilleur équilibre possible
 * tant que les sections restent entières.
 *
 * Retourne un tableau de longueur `count` ; chaque entrée = liste d'index de sections.
 */
export function splitSections(sections: ZoharSection[], count: number): number[][] {
  const n = Math.max(1, Math.min(count, sections.length));
  const buckets: { weight: number; idx: number; sections: number[] }[] = Array.from(
    { length: n },
    (_, idx) => ({ weight: 0, idx, sections: [] }),
  );

  const sorted = [...sections].sort((a, b) => sectionWeight(b) - sectionWeight(a));
  for (const s of sorted) {
    buckets.sort((a, b) => a.weight - b.weight || a.idx - b.idx);
    buckets[0].sections.push(s.index);
    buckets[0].weight += sectionWeight(s);
  }
  buckets.sort((a, b) => a.idx - b.idx);
  // Tri interne croissant pour une lecture chronologique
  buckets.forEach((b) => b.sections.sort((a, b) => a - b));
  return buckets.map((b) => b.sections);
}

/** Génère un code de session court et lisible. */
export function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I/O/0/1
  let out = "BRIT-";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

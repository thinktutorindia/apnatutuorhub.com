/**
 * lib/search/ranking.ts
 * Relevance Scoring, Haversine Distance Calculator, and Highlighting
 */

import { haversineDistanceKm } from "@/lib/haversine";

/**
 * Computes Haversine distance in kilometers between document location and query origin.
 * Returns null if origin or target coordinates are missing.
 */
export function computeDistance(
  targetLat: number | null,
  targetLng: number | null,
  originLat?: number,
  originLng?: number
): number | null {
  if (
    targetLat === null ||
    targetLng === null ||
    originLat === undefined ||
    originLng === undefined
  ) {
    return null;
  }
  return haversineDistanceKm(originLat, originLng, targetLat, targetLng);
}

/**
 * Generates highlighted HTML text snippets for search results matching target terms.
 */
export function highlightMatches(
  text: string,
  query?: string,
  tag = "mark"
): string {
  if (!query || !text) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map((t) => escapeRegExp(t)).join("|")})`, "gi");
  return text.replace(pattern, `<${tag} class="bg-amber-200 text-slate-900 rounded px-0.5">$1</${tag}>`);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ranks search hits by weighted composite score:
 * Score = (Relevance * 0.4) + (Rating * 0.3) + (VerificationBonus * 0.15) - (DistanceKm * 0.15)
 */
export function rankHits<T extends { rating?: number; isVerified?: boolean }>(
  hits: { document: T; score?: number; distanceKm?: number | null }[]
) {
  return hits.sort((a, b) => {
    const scoreA =
      (a.score ?? 50) * 0.4 +
      (a.document.rating ?? 0) * 20 * 0.3 +
      (a.document.isVerified ? 100 : 0) * 0.15 -
      Math.min(a.distanceKm ?? 50, 100) * 0.15;

    const scoreB =
      (b.score ?? 50) * 0.4 +
      (b.document.rating ?? 0) * 20 * 0.3 +
      (b.document.isVerified ? 100 : 0) * 0.15 -
      Math.min(b.distanceKm ?? 50, 100) * 0.15;

    return scoreB - scoreA;
  });
}

import type { Ingredient } from "../types";

/** The query parameter a shared shelf travels in. */
export const SHELF_PARAM = "shelf";

const PREFIX = "ingredient.";

/**
 * A shelf as a URL parameter: each ingredient's translation key without the
 * "ingredient." prefix, joined by hyphens — `london_dry_gin-campari`. Keys
 * rather than ids, because ids differ between databases seeded separately; and
 * keys never contain a hyphen, which the seed tests hold, so the split is exact.
 *
 * There is no account system, so a link is how a shelf moves from the laptop
 * to the phone, or from one person's bar to another's.
 */
export function encodeShelf(ids: readonly string[], catalogue: Ingredient[]): string {
  const byId = new Map(catalogue.map((i) => [i.id, i.translation_key ?? ""]));
  return ids
    .map((id) => byId.get(id) ?? "")
    .filter((key) => key.startsWith(PREFIX))
    .map((key) => key.slice(PREFIX.length))
    .join("-");
}

/** The ingredient ids a shared link names. Anything this catalogue lacks is skipped. */
export function decodeShelf(value: string, catalogue: Ingredient[]): string[] {
  const byKey = new Map(catalogue.map((i) => [i.translation_key, i.id]));
  const ids = new Set<string>();
  for (const part of value.split("-")) {
    const id = byKey.get(PREFIX + part.trim());
    if (id) ids.add(id);
  }
  return [...ids];
}

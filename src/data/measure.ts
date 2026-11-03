export type Units = "ml" | "oz";

/**
 * Thirty, not 29.57. The specs are written in 7.5 ml steps, which are exact
 * quarter-ounces at 30 — the convention every bar jigger follows. The true
 * figure would turn 22.5 ml into "0.76 oz" instead of "¾ oz".
 */
export const ML_PER_OZ = 30;

/** Amounts the seed file spells as words but that scale like numbers. */
const WORD_AMOUNTS: Record<string, number> = { half: 0.5 };

/**
 * Units that describe a technique rather than a quantity — "1 rinse", "Top up"
 * — and stay as written however many drinks are being made.
 */
const PER_GLASS = new Set(["up", "rim", "rinse", "splash"]);

/** Units that read differently once there is more than one. */
const PLURAL: Record<string, string> = {
  dash: "dashes",
  drop: "drops",
  slice: "slices",
  strip: "strips",
  cube: "cubes",
  sprig: "sprigs",
  stalk: "stalks",
  pinch: "pinches",
  spoon: "spoons",
  "bar spoon": "bar spoons",
  lime: "limes",
  chunk: "chunks",
};

const FRACTIONS: [number, string][] = [
  [0, ""],
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
  [1, ""],
];

/** Close enough to pour by: a twentieth of an ounce is 1.5 ml. */
const FRACTION_TOLERANCE = 0.05;

const plain = (n: number) => String(Math.round(n * 100) / 100);

/** Ounces the way a spec card writes them: "¾", "1½", "2⅓". */
export function formatOunces(oz: number): string {
  const whole = Math.floor(oz);
  const rest = oz - whole;

  let best = FRACTIONS[0];
  for (const candidate of FRACTIONS) {
    if (Math.abs(rest - candidate[0]) < Math.abs(rest - best[0])) best = candidate;
  }
  if (Math.abs(rest - best[0]) > FRACTION_TOLERANCE) return plain(oz);

  const units = whole + (best[0] === 1 ? 1 : 0);
  if (units === 0) return best[1] || "0";
  return `${units}${best[1]}`;
}

/**
 * One line of a spec, scaled to `servings` drinks and shown in `units`.
 *
 * Words that are not amounts ("Top") and technique units ("rinse") come back as
 * written; there is nothing to multiply.
 */
export function formatMeasure(
  amount: string,
  unit: string,
  servings: number,
  units: Units,
): { amount: string; unit: string } {
  const value = WORD_AMOUNTS[amount.trim().toLowerCase()] ?? Number(amount);
  const numeric = amount.trim() !== "" && Number.isFinite(value);

  // A float is a measured pour laid on top — "15 float" is 15 ml — so it scales
  // and converts like any other liquid line and keeps its technique as a suffix.
  if (unit === "ml" || unit === "float") {
    if (!numeric) return { amount, unit };
    const suffix = unit === "float" ? " float" : "";
    const total = value * servings;
    return units === "oz"
      ? { amount: formatOunces(total / ML_PER_OZ), unit: `oz${suffix}` }
      : { amount: servings === 1 ? amount : plain(total), unit: `ml${suffix}` };
  }

  if (servings === 1 || PER_GLASS.has(unit) || !numeric) return { amount, unit };
  const total = value * servings;
  return { amount: plain(total), unit: total > 1 ? (PLURAL[unit] ?? unit) : unit };
}

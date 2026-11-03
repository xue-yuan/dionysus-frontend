import { describe, expect, it } from "vite-plus/test";
import { formatMeasure, formatOunces } from "./measure";

describe("formatOunces", () => {
  it("writes the jigger steps as fractions", () => {
    expect(formatOunces(7.5 / 30)).toBe("¼");
    expect(formatOunces(15 / 30)).toBe("½");
    expect(formatOunces(22.5 / 30)).toBe("¾");
    expect(formatOunces(45 / 30)).toBe("1½");
    expect(formatOunces(60 / 30)).toBe("2");
  });

  it("uses thirds where the spec does", () => {
    expect(formatOunces(10 / 30)).toBe("⅓");
    expect(formatOunces(50 / 30)).toBe("1⅔");
  });

  it("rounds up into the next whole ounce", () => {
    expect(formatOunces(0.98)).toBe("1");
  });

  it("falls back to decimals when no fraction is close", () => {
    // Halfway between ½ and ⅝, so neither is within a twentieth of an ounce.
    expect(formatOunces(1.56)).toBe("1.56");
  });
});

describe("formatMeasure", () => {
  it("leaves a single drink in millilitres untouched", () => {
    expect(formatMeasure("22.5", "ml", 1, "ml")).toEqual({ amount: "22.5", unit: "ml" });
  });

  it("converts millilitres to ounces", () => {
    expect(formatMeasure("22.5", "ml", 1, "oz")).toEqual({ amount: "¾", unit: "oz" });
  });

  it("scales by servings before converting", () => {
    expect(formatMeasure("22.5", "ml", 2, "ml")).toEqual({ amount: "45", unit: "ml" });
    expect(formatMeasure("22.5", "ml", 2, "oz")).toEqual({ amount: "1½", unit: "oz" });
  });

  it("pluralises a counted unit once there is more than one", () => {
    expect(formatMeasure("1", "dash", 3, "ml")).toEqual({ amount: "3", unit: "dashes" });
    expect(formatMeasure("1", "strip", 2, "oz")).toEqual({ amount: "2", unit: "strips" });
  });

  it("scales a word amount that is really a number", () => {
    expect(formatMeasure("Half", "lime", 4, "ml")).toEqual({ amount: "2", unit: "limes" });
  });

  // "15 float" is fifteen millilitres laid on top, not one of something.
  it("treats a float as a measured pour", () => {
    expect(formatMeasure("15", "float", 1, "ml")).toEqual({ amount: "15", unit: "ml float" });
    expect(formatMeasure("15", "float", 2, "oz")).toEqual({ amount: "1", unit: "oz float" });
  });

  it("keeps what cannot be multiplied as written", () => {
    expect(formatMeasure("Top", "up", 4, "oz")).toEqual({ amount: "Top", unit: "up" });
    expect(formatMeasure("1", "rinse", 4, "ml")).toEqual({ amount: "1", unit: "rinse" });
  });
});

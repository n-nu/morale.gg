export type RatioMetric =
  | {
      numerator: number;
      denominator: number;
      state: "RATIO";
      value: number;
      display: string;
    }
  | {
      numerator: number;
      denominator: 0;
      state: "ZERO_DENOMINATOR";
      value: null;
      display: string;
    };

export function deriveRatio(
  numerator: number,
  denominator: number,
  zeroDenominatorUnit: "K" | "K+A",
): RatioMetric {
  if (denominator === 0) {
    return {
      numerator,
      denominator: 0,
      state: "ZERO_DENOMINATOR",
      value: null,
      display: `${numerator} ${zeroDenominatorUnit}`,
    };
  }

  const value = numerator / denominator;
  return { numerator, denominator, state: "RATIO", value, display: String(value) };
}

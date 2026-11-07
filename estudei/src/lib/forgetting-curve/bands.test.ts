import { describe, expect, it } from "vitest";
import { RETENTION_BANDS, bandForPercent, bandForRetention, isCritical } from "./bands";

describe("RETENTION_BANDS", () => {
  it("covers every percentage from 0 to 100 exactly once", () => {
    for (let p = 0; p <= 100; p++) {
      const matches = RETENTION_BANDS.filter((b) => p >= b.min && p <= b.max);
      expect(matches, `percentage ${p}`).toHaveLength(1);
    }
  });

  it("is ordered from best to worst", () => {
    const mins = RETENTION_BANDS.map((b) => b.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
  });
});

describe("bandForPercent", () => {
  it.each([
    [100, "green"],
    [80, "green"],
    [79, "yellow-green"],
    [60, "yellow-green"],
    [59, "yellow"],
    [40, "yellow"],
    [39, "orange"],
    [20, "orange"],
    [19, "red"],
    [0, "red"],
  ] as const)("%i%% is %s", (percent, color) => {
    expect(bandForPercent(percent).color).toBe(color);
  });

  it("clamps out-of-range values", () => {
    expect(bandForPercent(130).id).toBe("fresh");
    expect(bandForPercent(-5).id).toBe("critical");
  });
});

describe("bandForRetention", () => {
  it("uses the rounded percentage, matching what the UI displays", () => {
    // 79.6% is displayed as 80%, so it must be green, not yellow-green.
    expect(bandForRetention(0.796).id).toBe("fresh");
    expect(bandForRetention(0.194).id).toBe("critical");
    expect(bandForRetention(0.196).id).toBe("weak");
  });

  it("flags critical topics", () => {
    expect(isCritical(0.1)).toBe(true);
    expect(isCritical(0.25)).toBe(false);
  });
});

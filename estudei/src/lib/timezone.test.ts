import { describe, expect, it } from "vitest";
import { fromZonedInputValue, toZonedInputValue } from "./timezone";

describe("toZonedInputValue", () => {
  it("shows the wall-clock time in the given zone", () => {
    const instant = new Date("2026-03-02T01:30:00Z");
    expect(toZonedInputValue(instant, "America/Sao_Paulo")).toBe("2026-03-01T22:30");
    expect(toZonedInputValue(instant, "UTC")).toBe("2026-03-02T01:30");
  });

  it("uses 00 (not 24) for midnight", () => {
    expect(toZonedInputValue(new Date("2026-03-02T03:00:00Z"), "America/Sao_Paulo")).toBe("2026-03-02T00:00");
  });
});

describe("fromZonedInputValue", () => {
  it("is the inverse of toZonedInputValue", () => {
    const instant = new Date("2026-07-15T18:45:00Z");
    for (const tz of ["America/Sao_Paulo", "Europe/Lisbon", "Asia/Tokyo", "America/Manaus"]) {
      expect(fromZonedInputValue(toZonedInputValue(instant, tz), tz)?.toISOString()).toBe(instant.toISOString());
    }
  });

  it("handles daylight saving time", () => {
    // New York: EST (-5) in January, EDT (-4) in July.
    expect(fromZonedInputValue("2026-01-10T09:00", "America/New_York")?.toISOString()).toBe("2026-01-10T14:00:00.000Z");
    expect(fromZonedInputValue("2026-07-10T09:00", "America/New_York")?.toISOString()).toBe("2026-07-10T13:00:00.000Z");
  });

  it("returns null for malformed input", () => {
    expect(fromZonedInputValue("", "UTC")).toBeNull();
    expect(fromZonedInputValue("10/07/2026", "UTC")).toBeNull();
  });
});

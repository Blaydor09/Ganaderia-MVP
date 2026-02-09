import { describe, expect, it } from "vitest";
import {
  formatDateOnlyUtc,
  parseDateInputToUtcIso,
  parseDateTimeInputToIso,
  toDateInputValue,
} from "./dates";

describe("date helpers", () => {
  it("formats calendar dates without timezone drift", () => {
    const formatted = formatDateOnlyUtc("2026-02-09T00:00:00.000Z", "es-ES");
    expect(formatted).toBe("09/02/2026");
  });

  it("serializes date input to UTC midnight", () => {
    expect(parseDateInputToUtcIso("2026-02-09")).toBe("2026-02-09T00:00:00.000Z");
  });

  it("keeps ISO date value stable for inputs", () => {
    expect(toDateInputValue("2026-02-09T00:00:00.000Z")).toBe("2026-02-09");
  });

  it("serializes datetime-local values to ISO", () => {
    const value = "2026-02-09T14:45";
    expect(parseDateTimeInputToIso(value)).toBe(new Date(value).toISOString());
  });
});

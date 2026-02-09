import { describe, expect, it } from "vitest";
import { Access } from "./access";

describe("access role matrix", () => {
  it("allows veterinario to create events", () => {
    expect(Access.eventsCreate).toContain("VETERINARIO");
  });

  it("allows veterinario to close treatments", () => {
    expect(Access.treatmentsClose).toContain("VETERINARIO");
  });

  it("allows operador to create movements", () => {
    expect(Access.movementsCreate).toContain("OPERADOR");
  });
});

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

  it("allows only admin to delete products", () => {
    expect(Access.productsDelete).toEqual(["ADMIN"]);
  });

  it("allows veterinario to edit products", () => {
    expect(Access.productsUpdate).toContain("VETERINARIO");
  });

  it("allows only admin to delete batches", () => {
    expect(Access.batchesDelete).toEqual(["ADMIN"]);
  });

  it("allows operador to adjust inventory", () => {
    expect(Access.inventoryAdjust).toContain("OPERADOR");
  });
});

import { describe, expect, it } from "vitest";
import { getTreatmentAnimalCount, getTreatmentScopeLabel } from "./treatments";

describe("treatments helpers", () => {
  it("formats grouped scope labels with preview", () => {
    const label = getTreatmentScopeLabel({
      id: "t-1",
      mode: "GROUP",
      description: "Control",
      startedAt: "2026-02-10T10:00:00.000Z",
      status: "ACTIVE",
      animals: [
        { animalId: "a-1", animal: { id: "a-1", tag: "A-1" } },
        { animalId: "a-2", animal: { id: "a-2", tag: "A-2" } },
      ],
    });

    expect(getTreatmentAnimalCount({
      id: "t-1",
      mode: "GROUP",
      description: "Control",
      startedAt: "2026-02-10T10:00:00.000Z",
      status: "ACTIVE",
      animals: [
        { animalId: "a-1", animal: { id: "a-1", tag: "A-1" } },
        { animalId: "a-2", animal: { id: "a-2", tag: "A-2" } },
      ],
    })).toBe(2);
    expect(label).toContain("Grupo (2)");
    expect(label).toContain("A-1");
  });

  it("formats individual scope labels", () => {
    const label = getTreatmentScopeLabel({
      id: "t-2",
      mode: "INDIVIDUAL",
      animalId: "a-1",
      description: "Control",
      startedAt: "2026-02-10T10:00:00.000Z",
      status: "ACTIVE",
      animal: { id: "a-1", tag: "A-1" },
    });

    expect(label).toBe("A-1");
  });
});

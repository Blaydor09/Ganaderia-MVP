import type { Treatment } from "./types";
import { getAnimalIdentifier } from "./animals";

export const getTreatmentAnimalCount = (treatment: Treatment) => {
  if (treatment.mode === "GROUP") {
    return treatment.animals?.length ?? 0;
  }
  return treatment.animalId ? 1 : 0;
};

export const getTreatmentScopeLabel = (treatment: Treatment) => {
  if (treatment.mode === "GROUP") {
    const total = getTreatmentAnimalCount(treatment);
    const preview = (treatment.animals ?? [])
      .map((item) => getAnimalIdentifier(item?.animal))
      .slice(0, 3)
      .join(", ");
    if (!preview) return `Grupo (${total} animales)`;
    return total > 3 ? `Grupo (${total}): ${preview}...` : `Grupo (${total}): ${preview}`;
  }
  return getAnimalIdentifier(treatment.animal);
};

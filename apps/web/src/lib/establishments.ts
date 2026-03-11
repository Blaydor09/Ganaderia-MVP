import type { EstablishmentNode } from "@/lib/types";

export const establishmentTypeOptions = [
  { value: "FINCA", label: "Finca" },
  { value: "POTRERO", label: "Potrero" },
] as const;

const establishmentTypeLabels: Record<string, string> = {
  FINCA: "Finca",
  POTRERO: "Potrero",
  CORRAL: "Corral legado",
};

export const getEstablishmentTypeLabel = (value?: string) =>
  (value && establishmentTypeLabels[value]) || value || "-";

export const getOperationalEstablishmentOptions = (fincas: EstablishmentNode[] = []) => {
  const options: { value: string; label: string }[] = [];

  for (const finca of fincas) {
    for (const child of finca.children ?? []) {
      if (child.type !== "POTRERO") continue;
      options.push({ value: child.id, label: `${finca.name} / ${child.name}` });
    }
  }

  return options;
};


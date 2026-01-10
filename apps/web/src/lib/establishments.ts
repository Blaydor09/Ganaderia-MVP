export const establishmentTypeOptions = [
  { value: "FINCA", label: "Finca" },
  { value: "POTRERO", label: "Potrero" },
  { value: "CORRAL", label: "Corral" },
] as const;

const establishmentTypeLabels = establishmentTypeOptions.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {}
);

export const getEstablishmentTypeLabel = (value?: string) =>
  (value && establishmentTypeLabels[value]) || value || "-";

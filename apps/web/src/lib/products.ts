export const productTypeOptions = [
  { value: "VITAMINAS", label: "Vitaminas" },
  { value: "ANTIBIOTICOS", label: "Antibioticos" },
  { value: "DESPARASITANTE", label: "Desparasitante" },
  { value: "VACUNAS", label: "Vacunas" },
] as const;

const productTypeLabels = productTypeOptions.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {}
);

export const getProductTypeLabel = (value?: string) =>
  (value && productTypeLabels[value]) || value || "Sin tipo";

export const formatProductType = (type?: string, vaccineTypes?: string[]) => {
  const label = getProductTypeLabel(type);
  if (type === "VACUNAS" && vaccineTypes && vaccineTypes.length > 0) {
    return `${label}: ${vaccineTypes.join(", ")}`;
  }
  return label;
};

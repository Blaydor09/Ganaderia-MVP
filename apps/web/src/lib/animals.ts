export const animalCategoryOptions = [
  { value: "TERNERO", label: "Ternero" },
  { value: "VAQUILLA", label: "Vaquilla" },
  { value: "VACA", label: "Vaca" },
  { value: "TORO", label: "Toro" },
  { value: "TORILLO", label: "Torillo" },
] as const;

const animalCategoryLabels = animalCategoryOptions.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {}
);

export const getAnimalCategoryLabel = (value?: string) =>
  (value && animalCategoryLabels[value]) || value || "-";

export const animalSexOptions = [
  { value: "MALE", label: "Macho" },
  { value: "FEMALE", label: "Hembra" },
] as const;

export const animalOriginOptions = [
  { value: "BORN", label: "Nacido" },
  { value: "BOUGHT", label: "Comprado" },
] as const;

export const animalStatusOptions = [
  { value: "ACTIVO", label: "Activo" },
  { value: "VENDIDO", label: "Vendido" },
  { value: "MUERTO", label: "Muerto" },
  { value: "FAENADO", label: "Faenado" },
  { value: "PERDIDO", label: "Perdido" },
] as const;

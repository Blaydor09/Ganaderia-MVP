export const animalCategoryOptions = [
  { value: "TERNERO", label: "Ternero" },
  { value: "VAQUILLA", label: "Vaquilla" },
  { value: "VACA", label: "Vaca" },
  { value: "TORO", label: "Toro" },
  { value: "TORILLO", label: "Torillo" },
] as const;

export const animalQuickRegistrationCategoryOptions = [
  { value: "VACA", label: "Vaca" },
  { value: "TORO", label: "Toro" },
  { value: "VAQUILLA", label: "Vaquilla" },
  { value: "TORILLO", label: "Torillo" },
  { value: "TERNERO", label: "Ternero" },
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

type AnimalIdentifierSource = {
  tag?: string | null;
  internalCode?: string | null;
};

export const getAnimalIdentifier = (
  animal?: AnimalIdentifierSource | null,
  fallback = "Sin identificador"
) => animal?.tag || animal?.internalCode || fallback;

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

const animalStatusLabels = animalStatusOptions.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {}
);

export const getAnimalStatusLabel = (value?: string) =>
  (value && animalStatusLabels[value]) || value || "-";

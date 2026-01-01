export const generateAnimalCode = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  return `AN-${stamp}`;
};

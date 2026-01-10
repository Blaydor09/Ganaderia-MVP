import { randomBytes } from "crypto";

export const generateAnimalCode = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `AN-${stamp}-${random}`;
};

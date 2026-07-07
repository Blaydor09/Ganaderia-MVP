import bcrypt from "bcryptjs";
import { ApiError } from "./errors";

const BCRYPT_ROUNDS = 12;

const COMMON_PASSWORDS = new Set([
  "123456789012",
  "password1234",
  "password12345",
  "qwertyuiop12",
  "admin12345678",
  "contraseña123",
  "contrasena123",
  "letmein123456",
]);

export const assertStrongPassword = (plain: string) => {
  const normalized = plain.trim().toLowerCase();
  if (
    COMMON_PASSWORDS.has(normalized) ||
    /^(.)\1{11,}$/.test(normalized) ||
    /^(0123456789|1234567890)+$/.test(normalized)
  ) {
    throw new ApiError(400, "Password is too common or easily guessed");
  }
};

export const hashPassword = async (plain: string) => {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(plain, salt);
};

export const verifyPassword = async (plain: string, hash: string) => {
  return bcrypt.compare(plain, hash);
};

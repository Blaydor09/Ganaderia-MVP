import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const resolveEnvironment = () => process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";

const loadEnvFiles = (environment: string) => {
  dotenv.config();
  const envPath = path.resolve(process.cwd(), `.env.${environment}`);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
};

const environment = resolveEnvironment();
loadEnvFiles(environment);

const requireEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing env ${key}`);
  }
  return value;
};

const parseCorsOrigins = (value?: string) => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const isProduction = environment === "production";
let corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
if (!corsOrigins.length && !isProduction) {
  corsOrigins = ["http://localhost:5173"];
}
if (!corsOrigins.length && isProduction) {
  throw new Error("Missing env CORS_ORIGIN");
}
if (corsOrigins.includes("*")) {
  throw new Error("CORS_ORIGIN cannot include * when credentials are enabled");
}

const enableDocs =
  process.env.ENABLE_DOCS !== undefined
    ? process.env.ENABLE_DOCS === "true"
    : !isProduction;

const registrationModeRaw = (process.env.REGISTRATION_MODE ?? "open").toLowerCase();
const registrationMode =
  registrationModeRaw === "open" ||
  registrationModeRaw === "protected" ||
  registrationModeRaw === "closed"
    ? registrationModeRaw
    : "open";

if (registrationModeRaw !== registrationMode) {
  throw new Error("REGISTRATION_MODE must be open, protected, or closed");
}

const registrationCode = process.env.REGISTRATION_CODE;
if (registrationMode === "protected" && !registrationCode) {
  throw new Error("REGISTRATION_CODE is required when REGISTRATION_MODE=protected");
}

export const env = {
  nodeEnv: environment,
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtRefreshSecret: requireEnv("JWT_REFRESH_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  corsOrigin: corsOrigins,
  trustProxy: process.env.TRUST_PROXY === "true",
  enableDocs,
  registrationMode,
  registrationCode,
};

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.enum(["development", "test", "production"]);

const configuredAppEnv = process.env.APP_ENV;
if (!configuredAppEnv) {
  throw new Error("APP_ENV is required");
}

const initialEnvironment = environmentSchema.parse(configuredAppEnv);
const environmentFilePath = path.resolve(process.cwd(), `.env.${initialEnvironment}`);
if (fs.existsSync(environmentFilePath)) {
  dotenv.config({ path: environmentFilePath, override: true });
}

const rawEnv = z
  .object({
    APP_ENV: environmentSchema,
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().min(1).default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
    CORS_ORIGIN: z.string().optional(),
    TRUST_PROXY: z.enum(["true", "false"]).default("false"),
    ENABLE_DOCS: z.enum(["true", "false"]).optional(),
    REGISTRATION_MODE: z.enum(["open", "protected", "closed"]).default("open"),
    REGISTRATION_CODE: z.string().optional(),
    TENANT_CREATION_MODE: z.enum(["closed", "limited"]).default("closed"),
    MAX_TENANTS_PER_USER: z.coerce.number().int().min(1).max(20).default(1),
    MFA_ENCRYPTION_KEY: z.string().optional(),
    PASSWORD_RESET_DELIVERY_URL: z.string().url().optional(),
    PASSWORD_RESET_DELIVERY_SECRET: z.string().optional(),
  })
  .parse(process.env);

const isProduction = rawEnv.APP_ENV === "production";

const parseCorsOrigins = (value?: string) => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

let corsOrigins = parseCorsOrigins(rawEnv.CORS_ORIGIN);
if (!corsOrigins.length && !isProduction) {
  corsOrigins = ["http://localhost:5173", "http://localhost:5174"];
}
if (!corsOrigins.length && isProduction) {
  throw new Error("Missing env CORS_ORIGIN");
}
if (corsOrigins.includes("*")) {
  throw new Error("CORS_ORIGIN cannot include * when credentials are enabled");
}

const enableDocs = rawEnv.ENABLE_DOCS ? rawEnv.ENABLE_DOCS === "true" : !isProduction;
const trustProxy = rawEnv.TRUST_PROXY === "true";
const weakSecretPattern = /^(dev|test|secret|change|default|example|replace)/i;

const ensureStrongSecret = (key: string, value: string) => {
  if (Buffer.byteLength(value, "utf8") < 32 || weakSecretPattern.test(value)) {
    throw new Error(`${key} must be at least 32 bytes and not use default-like values`);
  }
};

const ensureHttpsOrigins = (origins: string[]) => {
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }
    if (parsed.protocol !== "https:") {
      throw new Error("Production CORS_ORIGIN values must be explicit HTTPS origins");
    }
  }
};

if (rawEnv.REGISTRATION_MODE === "protected" && !rawEnv.REGISTRATION_CODE) {
  throw new Error("REGISTRATION_CODE is required when REGISTRATION_MODE=protected");
}

if (isProduction) {
  if (rawEnv.NODE_ENV !== "production") {
    throw new Error("NODE_ENV must be production when APP_ENV=production");
  }
  if (!trustProxy) {
    throw new Error("TRUST_PROXY must be true in production");
  }
  if (enableDocs) {
    throw new Error("ENABLE_DOCS must be false in production");
  }
  if (rawEnv.REGISTRATION_MODE === "open") {
    throw new Error("REGISTRATION_MODE=open is not allowed in production");
  }
  if (rawEnv.JWT_SECRET === rawEnv.JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different values");
  }
  ensureStrongSecret("JWT_SECRET", rawEnv.JWT_SECRET);
  ensureStrongSecret("JWT_REFRESH_SECRET", rawEnv.JWT_REFRESH_SECRET);
  if (!rawEnv.MFA_ENCRYPTION_KEY) {
    throw new Error("MFA_ENCRYPTION_KEY is required in production");
  }
  ensureStrongSecret("MFA_ENCRYPTION_KEY", rawEnv.MFA_ENCRYPTION_KEY);
  if (!rawEnv.PASSWORD_RESET_DELIVERY_URL || !rawEnv.PASSWORD_RESET_DELIVERY_SECRET) {
    throw new Error("Password reset delivery must be configured in production");
  }
  if (!rawEnv.PASSWORD_RESET_DELIVERY_URL.startsWith("https://")) {
    throw new Error("PASSWORD_RESET_DELIVERY_URL must use HTTPS in production");
  }
  ensureStrongSecret("PASSWORD_RESET_DELIVERY_SECRET", rawEnv.PASSWORD_RESET_DELIVERY_SECRET);
  ensureHttpsOrigins(corsOrigins);

  const databaseUrl = new URL(rawEnv.DATABASE_URL);
  if (decodeURIComponent(databaseUrl.username) !== "ganaderia_app") {
    throw new Error("Production DATABASE_URL must use the ganaderia_app runtime role");
  }
  if (databaseUrl.pathname.replace(/^\//, "") === "postgres") {
    throw new Error("Production DATABASE_URL must not use the postgres maintenance database");
  }
}

export const env = {
  appEnv: rawEnv.APP_ENV,
  nodeEnv: rawEnv.NODE_ENV ?? rawEnv.APP_ENV,
  isProduction,
  port: rawEnv.PORT,
  host: rawEnv.HOST ?? (isProduction ? "127.0.0.1" : "0.0.0.0"),
  databaseUrl: rawEnv.DATABASE_URL,
  jwtSecret: rawEnv.JWT_SECRET,
  jwtRefreshSecret: rawEnv.JWT_REFRESH_SECRET,
  jwtExpiresIn: rawEnv.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: rawEnv.JWT_REFRESH_EXPIRES_IN,
  corsOrigin: corsOrigins,
  trustProxy,
  enableDocs,
  registrationMode: rawEnv.REGISTRATION_MODE,
  registrationCode: rawEnv.REGISTRATION_CODE,
  tenantCreationMode: rawEnv.TENANT_CREATION_MODE,
  maxTenantsPerUser: rawEnv.MAX_TENANTS_PER_USER,
  mfaEncryptionKey: rawEnv.MFA_ENCRYPTION_KEY ?? rawEnv.JWT_SECRET,
  passwordResetDeliveryUrl: rawEnv.PASSWORD_RESET_DELIVERY_URL,
  passwordResetDeliverySecret: rawEnv.PASSWORD_RESET_DELIVERY_SECRET,
};

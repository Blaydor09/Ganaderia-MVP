import jwt, { SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env";

export type JwtScope = "tenant" | "platform";

export type JwtPayload = {
  sub: string;
  roles: string[];
  scope: JwtScope;
  tenantId?: string;
  impersonationSessionId?: string;
};

const JWT_ALGORITHM = "HS256";
const TOKEN_ISSUER = "inventario-ganaderia";
const ACCESS_AUDIENCE: Record<JwtScope, string> = {
  tenant: "inventario-ganaderia:tenant:access",
  platform: "inventario-ganaderia:platform:access",
};
const REFRESH_AUDIENCE: Record<JwtScope, string> = {
  tenant: "inventario-ganaderia:tenant:refresh",
  platform: "inventario-ganaderia:platform:refresh",
};
const ALL_ACCESS_AUDIENCES = Object.values(ACCESS_AUDIENCE) as [string, ...string[]];
const ALL_REFRESH_AUDIENCES = Object.values(REFRESH_AUDIENCE) as [string, ...string[]];
const MFA_ENROLLMENT_AUDIENCE = "inventario-ganaderia:platform:mfa-enrollment";

const normalizePayload = (raw: any): JwtPayload => {
  const scope: JwtScope = raw?.scope === "platform" ? "platform" : "tenant";
  const tenantId =
    typeof raw?.tenantId === "string" && raw.tenantId.length > 0 ? raw.tenantId : undefined;

  if (scope === "tenant" && !tenantId) {
    throw new Error("Invalid tenant token");
  }

  return {
    sub: String(raw?.sub ?? ""),
    roles: Array.isArray(raw?.roles) ? raw.roles.map(String) : [],
    scope,
    tenantId,
    impersonationSessionId:
      typeof raw?.impersonationSessionId === "string"
        ? raw.impersonationSessionId
        : undefined,
  };
};

export const signAccessToken = (payload: JwtPayload) => {
  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    audience: ACCESS_AUDIENCE[payload.scope],
    issuer: TOKEN_ISSUER,
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwtSecret, options);
};

export const signRefreshToken = (payload: JwtPayload) => {
  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    audience: REFRESH_AUDIENCE[payload.scope],
    issuer: TOKEN_ISSUER,
    expiresIn: env.jwtRefreshExpiresIn as SignOptions["expiresIn"],
    jwtid: randomUUID(),
  };
  return jwt.sign(payload, env.jwtRefreshSecret, options);
};

export const verifyAccessToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
    audience: ALL_ACCESS_AUDIENCES,
    issuer: TOKEN_ISSUER,
  }) as any;
  return normalizePayload(decoded);
};

export const verifyRefreshToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtRefreshSecret, {
    algorithms: [JWT_ALGORITHM],
    audience: ALL_REFRESH_AUDIENCES,
    issuer: TOKEN_ISSUER,
  }) as any;
  return normalizePayload(decoded);
};

export const signMfaEnrollmentToken = (userId: string) =>
  jwt.sign({ sub: userId, purpose: "mfa-enrollment" }, env.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    audience: MFA_ENROLLMENT_AUDIENCE,
    issuer: TOKEN_ISSUER,
    expiresIn: "10m",
    jwtid: randomUUID(),
  });

export const verifyMfaEnrollmentToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
    audience: MFA_ENROLLMENT_AUDIENCE,
    issuer: TOKEN_ISSUER,
  }) as { sub?: string; purpose?: string };
  if (!decoded.sub || decoded.purpose !== "mfa-enrollment") {
    throw new Error("Invalid MFA enrollment token");
  }
  return decoded.sub;
};

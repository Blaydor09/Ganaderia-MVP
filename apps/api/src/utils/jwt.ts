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
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwtSecret, options);
};

export const signRefreshToken = (payload: JwtPayload) => {
  const options: SignOptions = {
    expiresIn: env.jwtRefreshExpiresIn as SignOptions["expiresIn"],
    jwtid: randomUUID(),
  };
  return jwt.sign(payload, env.jwtRefreshSecret, options);
};

export const verifyAccessToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtSecret) as any;
  return normalizePayload(decoded);
};

export const verifyRefreshToken = (token: string) => {
  const decoded = jwt.verify(token, env.jwtRefreshSecret) as any;
  return normalizePayload(decoded);
};

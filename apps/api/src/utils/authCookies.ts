import { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";
import { parseDurationToMs } from "./duration";

export const TENANT_REFRESH_COOKIE = "ig_refresh_token";
export const PLATFORM_REFRESH_COOKIE = "ig_platform_refresh_token";

export const tenantCookiePath = "/api/v1/auth";
export const platformCookiePath = "/api/v1/platform/auth";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "strict",
};

const refreshCookieMaxAge = parseDurationToMs(env.jwtRefreshExpiresIn);

export const tenantRefreshCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  path: tenantCookiePath,
  maxAge: refreshCookieMaxAge,
};

export const platformRefreshCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  path: platformCookiePath,
  maxAge: refreshCookieMaxAge,
};

const tenantCookieClearOptions: CookieOptions = {
  ...baseCookieOptions,
  path: tenantCookiePath,
};

const platformCookieClearOptions: CookieOptions = {
  ...baseCookieOptions,
  path: platformCookiePath,
};

export const setTenantRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(TENANT_REFRESH_COOKIE, refreshToken, tenantRefreshCookieOptions);
};

export const clearTenantRefreshCookie = (res: Response) => {
  res.clearCookie(TENANT_REFRESH_COOKIE, tenantCookieClearOptions);
};

export const readTenantRefreshCookie = (req: Request) =>
  typeof req.cookies?.[TENANT_REFRESH_COOKIE] === "string"
    ? req.cookies[TENANT_REFRESH_COOKIE]
    : undefined;

export const setPlatformRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(PLATFORM_REFRESH_COOKIE, refreshToken, platformRefreshCookieOptions);
};

export const clearPlatformRefreshCookie = (res: Response) => {
  res.clearCookie(PLATFORM_REFRESH_COOKIE, platformCookieClearOptions);
};

export const readPlatformRefreshCookie = (req: Request) =>
  typeof req.cookies?.[PLATFORM_REFRESH_COOKIE] === "string"
    ? req.cookies[PLATFORM_REFRESH_COOKIE]
    : undefined;

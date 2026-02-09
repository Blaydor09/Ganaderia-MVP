const ACCESS_KEY = "ig_platform_access_token";
const REFRESH_KEY = "ig_platform_refresh_token";

export type PlatformRole = "platform_super_admin" | "platform_support";

export const getAccessToken = () =>
  typeof window === "undefined" ? null : sessionStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () =>
  typeof window === "undefined" ? null : sessionStorage.getItem(REFRESH_KEY);

export const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  sessionStorage.setItem(REFRESH_KEY, refreshToken);
};

export const clearTokens = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
};

export const isAuthenticated = () => Boolean(getAccessToken());

const decodeBase64 = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
};

export const getPlatformRoles = (): PlatformRole[] => {
  const token = getAccessToken();
  if (!token) return [];
  const parts = token.split(".");
  if (parts.length < 2) return [];
  try {
    const payload = JSON.parse(decodeBase64(parts[1])) as { roles?: PlatformRole[] };
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
};

export const hasPlatformRole = (role: PlatformRole) => getPlatformRoles().includes(role);

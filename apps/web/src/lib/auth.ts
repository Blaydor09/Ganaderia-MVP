const ACCESS_KEY = "ig_access_token";
const REFRESH_KEY = "ig_refresh_token";

export type Role = "ADMIN" | "VETERINARIO" | "OPERADOR" | "AUDITOR";

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

export const isAuthenticated = () => Boolean(getAccessToken());

const decodeBase64 = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
};

export const getUserRoles = (): Role[] => {
  const token = getAccessToken();
  if (!token) return [];
  const parts = token.split(".");
  if (parts.length < 2) return [];
  try {
    const payload = JSON.parse(decodeBase64(parts[1])) as { roles?: Role[] };
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
};

export const hasAnyRole = (allowed: Role[]) => {
  const roles = getUserRoles();
  return roles.some((role) => allowed.includes(role));
};

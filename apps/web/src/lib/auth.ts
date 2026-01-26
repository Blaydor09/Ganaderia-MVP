const ACCESS_KEY = "ig_access_token";
const REFRESH_KEY = "ig_refresh_token";

export type Role = "ADMIN" | "VETERINARIO" | "OPERADOR" | "AUDITOR";

const migrateTokens = () => {
  if (typeof window === "undefined") return;
  const sessionAccess = sessionStorage.getItem(ACCESS_KEY);
  const sessionRefresh = sessionStorage.getItem(REFRESH_KEY);
  const localAccess = localStorage.getItem(ACCESS_KEY);
  const localRefresh = localStorage.getItem(REFRESH_KEY);

  if (!sessionAccess && localAccess) {
    sessionStorage.setItem(ACCESS_KEY, localAccess);
  }
  if (!sessionRefresh && localRefresh) {
    sessionStorage.setItem(REFRESH_KEY, localRefresh);
  }
  if (localAccess || localRefresh) {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
};

migrateTokens();

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

export const getTenantId = (): string | null => {
  const token = getAccessToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(decodeBase64(parts[1])) as { tenantId?: string };
    return typeof payload.tenantId === "string" ? payload.tenantId : null;
  } catch {
    return null;
  }
};

export const hasAnyRole = (allowed: Role[]) => {
  const roles = getUserRoles();
  return roles.some((role) => allowed.includes(role));
};

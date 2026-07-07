import { useSyncExternalStore } from "react";

export type Role = "ADMIN" | "VETERINARIO" | "OPERADOR" | "AUDITOR";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthSnapshot = {
  status: AuthStatus;
  accessToken: string | null;
};

let snapshot: AuthSnapshot = {
  status: "loading",
  accessToken: null,
};
let bootstrapPromise: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setSnapshot = (nextSnapshot: AuthSnapshot) => {
  if (
    snapshot.status === nextSnapshot.status &&
    snapshot.accessToken === nextSnapshot.accessToken
  ) {
    return;
  }

  snapshot = nextSnapshot;
  emit();
};

export const getAccessToken = () => snapshot.accessToken;

export const setAccessToken = (accessToken: string) => {
  bootstrapPromise = Promise.resolve(accessToken);
  setSnapshot({ status: "authenticated", accessToken });
};

export const clearTokens = () => {
  bootstrapPromise = null;
  setSnapshot({ status: "anonymous", accessToken: null });
};

export const initializeAuth = (restoreSession: () => Promise<string | null>) => {
  if (snapshot.status !== "loading") {
    return bootstrapPromise ?? Promise.resolve(snapshot.accessToken);
  }

  if (!bootstrapPromise) {
    bootstrapPromise = restoreSession()
      .then((accessToken) => {
        if (accessToken) {
          setSnapshot({ status: "authenticated", accessToken });
          return accessToken;
        }

        setSnapshot({ status: "anonymous", accessToken: null });
        return null;
      })
      .catch(() => {
        setSnapshot({ status: "anonymous", accessToken: null });
        return null;
      });
  }

  return bootstrapPromise;
};

export const useAuthState = () =>
  useSyncExternalStore(subscribe, () => snapshot, () => snapshot);

export const isAuthenticated = () =>
  snapshot.status === "authenticated" && Boolean(snapshot.accessToken);

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

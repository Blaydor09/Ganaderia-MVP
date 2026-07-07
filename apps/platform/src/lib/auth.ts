import { useSyncExternalStore } from "react";

export type PlatformRole = "platform_super_admin" | "platform_support";
type AuthStatus = "loading" | "authenticated" | "anonymous";
type AuthSnapshot = { status: AuthStatus; accessToken: string | null };

let snapshot: AuthSnapshot = { status: "loading", accessToken: null };
let bootstrapPromise: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setSnapshot = (next: AuthSnapshot) => {
  if (snapshot.status === next.status && snapshot.accessToken === next.accessToken) return;
  snapshot = next;
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
        setSnapshot(
          accessToken
            ? { status: "authenticated", accessToken }
            : { status: "anonymous", accessToken: null }
        );
        return accessToken;
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

import axios, { InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";

const defaultBaseUrl = import.meta.env.PROD
  ? "/api/v1"
  : "http://localhost:4000/api/v1";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? defaultBaseUrl,
  withCredentials: true,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const shouldSkipRefresh = (url?: string) => {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/registration-status")
  );
};

const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/login" || path === "/register" || path === "/landing") return;
  window.location.assign("/login");
};

let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();

  try {
    const payload = refreshToken ? { refreshToken } : {};
    const response = await api.post("/auth/refresh", payload);
    const newAccessToken = response.data?.accessToken;
    if (typeof newAccessToken !== "string" || !newAccessToken) return null;
    const nextRefreshToken =
      typeof response.data?.refreshToken === "string"
        ? response.data.refreshToken
        : refreshToken ?? null;
    setTokens(newAccessToken, nextRefreshToken);
    return newAccessToken;
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalConfig = error?.config as RetriableRequestConfig | undefined;

    if (
      status !== 401 ||
      !originalConfig ||
      originalConfig._retry ||
      shouldSkipRefresh(originalConfig.url)
    ) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }

    const newAccessToken = await refreshInFlight;
    if (!newAccessToken) {
      clearTokens();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalConfig.headers = originalConfig.headers ?? {};
    originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(originalConfig);
  }
);

export default api;

import axios from "axios";
import { getAccessToken } from "./auth";

const defaultBaseUrl = import.meta.env.PROD
  ? "/api/v1"
  : "http://localhost:4000/api/v1";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? defaultBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

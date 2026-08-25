import axios from "axios";
import { store } from "@/store";
import { resetQueryCache } from "@/api/resetQueryCache";
import { clearCredentials } from "@/store/authSlice";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

client.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    const isAuthRequest =
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/signup") ||
      url.includes("/api/auth/verify") ||
      url.includes("/api/auth/resend-verification");

    if (status === 401 && !isAuthRequest) {
      void resetQueryCache();
      store.dispatch(clearCredentials());
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default client;

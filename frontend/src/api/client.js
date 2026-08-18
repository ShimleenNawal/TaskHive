import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Inject JWT on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear localStorage and redirect to login
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
      localStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default client;

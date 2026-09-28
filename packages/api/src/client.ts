import axios from "axios";

export const apiClient = axios.create({
  baseURL: "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export const configureApiClient = (opts: { baseURL: string }) => {
  if (opts.baseURL) apiClient.defaults.baseURL = opts.baseURL;
};

apiClient.interceptors.request.use((config) => {
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const storeId = localStorage.getItem("x-store-id");
    if (storeId) config.headers["x-store-id"] = storeId;
  }
  return config;
});

export const httpClient = apiClient;

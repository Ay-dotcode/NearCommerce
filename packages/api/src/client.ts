import axios from "axios";
import { STORE_KEY } from "./constants";

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
    const storeId = localStorage.getItem(STORE_KEY);
    if (storeId) config.headers[STORE_KEY] = storeId;
  }
  return config;
});

export const httpClient = apiClient;

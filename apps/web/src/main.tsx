import App from "@/app/App";
import { AppRoutes } from "@/constants/routes";
import { installTokenRefresh } from "@/features/auth/session";
import "@/index.css";
import { configureApiClient } from "@nearcommerce/api";
import React from "react";
import ReactDOM from "react-dom/client";

configureApiClient({ baseURL: import.meta.env.VITE_API_URL });
installTokenRefresh(() => {
  if (!window.location.pathname.startsWith(AppRoutes.login))
    window.location.assign(AppRoutes.login);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

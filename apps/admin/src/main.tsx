import App from "@/App";
import "@/index.css";
import { installTokenRefresh } from "@/session";
import { configureApiClient } from "@nearcommerce/api";
import React from "react";
import ReactDOM from "react-dom/client";

configureApiClient({ baseURL: import.meta.env.VITE_API_URL });
installTokenRefresh(() => {
  if (window.location.pathname !== "/login") window.location.assign("/login");
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import App from "@/app/App";
import "@/index.css";
import { configureApiClient } from "@nearcommerce/api";
import React from "react";
import ReactDOM from "react-dom/client";

configureApiClient({ baseURL: import.meta.env.VITE_API_URL });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
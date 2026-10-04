import App from "@/App";
import "@/index.css";
import { installTokenRefresh } from "@/session";
import React from "react";
import ReactDOM from "react-dom/client";

installTokenRefresh(() => {
  if (window.location.pathname !== "/login") window.location.assign("/login");
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

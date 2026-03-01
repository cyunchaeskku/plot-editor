import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { setToken } from "./api";
import "./App.css";

// Extract OAuth token from URL hash BEFORE HashRouter initializes.
// Cognito redirects to {FRONTEND_URL}#token={jwt}. HashRouter would try to
// route "#token=..." as a path, so we intercept and clear it here first.
const _hash = window.location.hash;
if (_hash.startsWith("#token=")) {
  setToken(_hash.slice(7));
  window.history.replaceState(null, "", window.location.pathname);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

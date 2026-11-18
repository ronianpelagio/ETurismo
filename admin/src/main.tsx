import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminApp from "./admin/App";
import Landing from "./Landing";
// Initialise i18n — wait for the promise to resolve before mounting so
// translations are always ready on first render (fixes missing keys on Vercel).
import { i18nReady } from "./admin/i18n";
import "./styles.css";

const queryClient = new QueryClient();

function renderApp() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

// Wait for i18n to initialise before mounting so translations are ready on
// the very first render — avoids raw key flash on Vercel production builds.
i18nReady.then(renderApp).catch(() => {
  // Fall back to mounting anyway so the app doesn't stay blank on error
  renderApp();
});

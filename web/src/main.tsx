import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import AppProviders from "@/app/AppProviders";
import { router } from "@/app/router";
import { installGlobalErrorHandlers } from "@/core/log";
import "./styles.css";

installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);

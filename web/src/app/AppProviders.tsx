import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/core/auth";
import { NotificationsProvider } from "@/core/notifications";
import { PreferencesProvider } from "@/core/preferences";
import { createQueryClient } from "@/core/query/queryClient";

/** Proveedores globales, de afuera hacia adentro: preferencias, consultas, avisos y sesión. */
export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <PreferencesProvider>
      <QueryClientProvider client={queryClient}>
        <NotificationsProvider>
          <AuthProvider>{children}</AuthProvider>
        </NotificationsProvider>
      </QueryClientProvider>
    </PreferencesProvider>
  );
}

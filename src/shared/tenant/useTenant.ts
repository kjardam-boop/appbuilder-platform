import { tenants, TenantConfig } from "./tenants";

export function useTenant(): TenantConfig {
  const qp = new URLSearchParams(window.location.search);
  const id = qp.get("tenant") || "akselera";
  return tenants[id] || tenants["akselera"];
}

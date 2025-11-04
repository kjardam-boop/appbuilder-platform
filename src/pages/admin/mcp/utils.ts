export interface RevealRoleRow { scope_id: string }
export interface RevealSecretRow { tenant_id?: string }

/**
 * Resolve tenantId to use for revealing a secret.
 * Priority: tenant_id from secrets (server-selected) -> first tenant role -> null
 */
export function resolveTenantIdForReveal(
  secrets: RevealSecretRow[] | undefined,
  roles: RevealRoleRow[] | undefined
): string | null {
  const tenantFromSecrets = secrets?.[0]?.tenant_id
  if (tenantFromSecrets) return tenantFromSecrets

  const tenantFromRoles = roles?.[0]?.scope_id
  return tenantFromRoles || null
}

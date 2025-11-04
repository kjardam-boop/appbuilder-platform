import { describe, it, expect } from 'vitest'
import { resolveTenantIdForReveal, type RevealRoleRow, type RevealSecretRow } from './utils'

describe('resolveTenantIdForReveal', () => {
  it('prefers tenant_id from secrets', () => {
    const secrets: RevealSecretRow[] = [{ tenant_id: 'tenant-from-secret' }]
    const roles: RevealRoleRow[] = [{ scope_id: 'tenant-from-role' }]
    expect(resolveTenantIdForReveal(secrets, roles)).toBe('tenant-from-secret')
  })

  it('falls back to first tenant role when secrets missing tenant_id', () => {
    const secrets: RevealSecretRow[] = [{}]
    const roles: RevealRoleRow[] = [{ scope_id: 'tenant-from-role' }]
    expect(resolveTenantIdForReveal(secrets, roles)).toBe('tenant-from-role')
  })

  it('returns null when neither source available', () => {
    const secrets: RevealSecretRow[] = []
    const roles: RevealRoleRow[] = []
    expect(resolveTenantIdForReveal(secrets, roles)).toBeNull()
  })
})
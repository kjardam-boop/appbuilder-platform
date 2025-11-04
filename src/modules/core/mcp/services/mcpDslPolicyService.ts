/**
 * MCP DSL Policy Service
 * Evaluates declarative policy rules for access control
 */

import { McpContext, McpPolicyResult, McpPolicyRule, McpPolicySet } from '../types/mcp.types';
import { DEFAULT_POLICY } from '../policy/defaultPolicy';

export interface PolicyEvaluationContext {
  resourceType?: string;
  resourceId?: string;
  actionName?: string;
  method?: string;
}

export class McpDslPolicyService {
  /**
   * Evaluate policy rules for a given context
   * 
   * Algorithm:
   * 1. Evaluate DENY rules first (fail-fast)
   * 2. Then evaluate ALLOW rules
   * 3. If no rule applies → deny by default
   */
  static evaluatePolicy(
    ctx: McpContext,
    evalCtx: PolicyEvaluationContext,
    policySet: McpPolicySet = DEFAULT_POLICY
  ): McpPolicyResult {
    const roles = ctx.roles || [];
    
    // Step 1: Check DENY rules first
    for (const rule of policySet) {
      if (rule.effect === 'deny') {
        if (this.ruleMatches(rule, roles, evalCtx)) {
          return {
            decision: 'denied',
            reason: `Deny rule matched for roles: ${roles.join(', ')}`,
            checked_roles: roles,
            checked_at: new Date().toISOString(),
            matched_rule: rule,
          };
        }
      }
    }

    // Step 2: Check ALLOW rules
    for (const rule of policySet) {
      if (rule.effect === 'allow') {
        if (this.ruleMatches(rule, roles, evalCtx)) {
          // Check conditions if present
          if (rule.conditions) {
            const conditionCheck = this.evaluateConditions(rule.conditions, ctx, evalCtx);
            if (!conditionCheck.passed) {
              return {
                decision: 'denied',
                reason: conditionCheck.reason || 'Condition check failed',
                checked_roles: roles,
                checked_at: new Date().toISOString(),
                matched_rule: rule,
              };
            }
          }

          return {
            decision: 'allowed',
            reason: `Allow rule matched`,
            checked_roles: roles,
            checked_at: new Date().toISOString(),
            matched_rule: rule,
          };
        }
      }
    }

    // Step 3: Default deny
    return {
      decision: 'denied',
      reason: `No matching allow rule for roles: ${roles.join(', ')}`,
      checked_roles: roles,
      checked_at: new Date().toISOString(),
    };
  }

  /**
   * Check if a rule matches the given context
   */
  private static ruleMatches(
    rule: McpPolicyRule,
    userRoles: string[],
    evalCtx: PolicyEvaluationContext
  ): boolean {
    // Check role match
    if (!this.roleMatches(rule.role, userRoles)) {
      return false;
    }

    // Check resource match if specified
    if (rule.resource && evalCtx.resourceType) {
      if (!this.fieldMatches(rule.resource, evalCtx.resourceType)) {
        return false;
      }
    }

    // Check action match if specified
    if (rule.action && evalCtx.actionName) {
      if (!this.fieldMatches(rule.action, evalCtx.actionName)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user has any of the required roles
   */
  private static roleMatches(ruleRole: string | string[], userRoles: string[]): boolean {
    const requiredRoles = Array.isArray(ruleRole) ? ruleRole : [ruleRole];
    
    // Wildcard match
    if (requiredRoles.includes('*')) {
      return true;
    }

    // Check if user has any of the required roles
    return requiredRoles.some(role => userRoles.includes(role));
  }

  /**
   * Check if a field value matches the rule specification
   * Supports:
   * - Exact match
   * - Wildcard (*)
   * - Namespaced actions (app.action format)
   */
  private static fieldMatches(ruleValue: string | string[], actualValue: string): boolean {
    const allowed = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
    
    // Wildcard match
    if (allowed.includes('*')) {
      return true;
    }

    // Check each allowed pattern
    for (const pattern of allowed) {
      // Exact match
      if (pattern === actualValue) {
        return true;
      }
      
      // Namespaced action match (e.g., "erp-screening.*" matches "erp-screening.create_scorecard")
      if (pattern.includes('.') && actualValue.includes('.')) {
        const [patternApp, patternAction] = pattern.split('.');
        const [actualApp, actualAction] = actualValue.split('.');
        
        if (patternApp === actualApp) {
          if (patternAction === '*' || patternAction === actualAction) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Evaluate rule conditions
   * 
   * Note: ownerOnly requires data fetching - this is handled at the edge function level
   * by passing in the supplier company_id check
   */
  private static evaluateConditions(
    conditions: NonNullable<McpPolicyRule['conditions']>,
    ctx: McpContext,
    evalCtx: PolicyEvaluationContext
  ): { passed: boolean; reason?: string } {
    // tenantMatch condition
    if (conditions.tenantMatch) {
      // This would require resource data - typically checked at data layer
      // For now, we assume tenant isolation is enforced by RLS
    }

    // ownerOnly condition
    if (conditions.ownerOnly) {
      // This requires resource-specific ownership check
      // The edge function must verify ownership before allowing access
      // We mark it as requiring verification
      return {
        passed: true, // Pass here, but edge function must verify
        reason: 'ownerOnly condition requires verification at data layer',
      };
    }

    return { passed: true };
  }

  /**
   * Check if a specific resource operation is allowed
   */
  static canAccessResource(
    ctx: McpContext,
    resourceType: string,
    operation: 'list' | 'get'
  ): McpPolicyResult {
    return this.evaluatePolicy(ctx, {
      resourceType,
      actionName: operation,
      method: operation === 'list' ? 'GET' : 'GET',
    });
  }

  /**
   * Check if a specific action can be executed
   */
  static canExecuteAction(
    ctx: McpContext,
    actionName: string
  ): McpPolicyResult {
    return this.evaluatePolicy(ctx, {
      actionName,
      method: 'POST',
    });
  }
}

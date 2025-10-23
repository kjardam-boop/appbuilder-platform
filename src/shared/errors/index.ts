/**
 * Custom error classes for the platform
 */

export class PlatformError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

export class TenantNotFoundError extends PlatformError {
  constructor(host: string) {
    super(
      `Tenant not found for host: ${host}`,
      'TENANT_NOT_FOUND',
      404,
      { host }
    );
    this.name = 'TenantNotFoundError';
  }
}

export class UnauthorizedError extends PlatformError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends PlatformError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends PlatformError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ModuleNotEnabledError extends PlatformError {
  constructor(moduleName: string, tenantId: string) {
    super(
      `Module '${moduleName}' is not enabled for tenant`,
      'MODULE_NOT_ENABLED',
      403,
      { module: moduleName, tenant_id: tenantId }
    );
    this.name = 'ModuleNotEnabledError';
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: Error) {
  if (error instanceof PlatformError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      metadata: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    metadata: {
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
  };
}

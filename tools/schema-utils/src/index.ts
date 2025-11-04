/**
 * Schema Utilities
 * Conversion and validation for Zod and JSON Schema
 */

import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

/**
 * Convert Zod schema to JSON Schema
 */
export function zodToJson(zodSchema: z.ZodType): Record<string, any> {
  return zodToJsonSchema(zodSchema, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  }) as Record<string, any>;
}

/**
 * Validate data against JSON Schema
 */
export function validateJson(
  schema: Record<string, any>,
  data: any
): { ok: boolean; errors: string[] } {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    return { ok: true, errors: [] };
  }

  const errors = (validate.errors || []).map((err) => {
    return `${err.instancePath || '/'}: ${err.message}`;
  });

  return { ok: false, errors };
}

/**
 * Validate data against Zod schema
 */
export function validateZod(
  zodSchema: z.ZodType,
  data: any
): { ok: boolean; errors: string[] } {
  const result = zodSchema.safeParse(data);

  if (result.success) {
    return { ok: true, errors: [] };
  }

  const errors = result.error.errors.map((err) => {
    return `${err.path.join('.')}: ${err.message}`;
  });

  return { ok: false, errors };
}

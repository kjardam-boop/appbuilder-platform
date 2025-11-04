/**
 * Manifest Validator
 * Validates app manifest structure and schemas
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import semver from 'semver';
import { z } from 'zod';

const manifestSchema = z.object({
  name: z.string().min(1),
  key: z.string().regex(/^[a-z0-9-]+$/, 'Must be a valid slug'),
  version: z.string().refine((v) => semver.valid(v), 'Must be valid semver'),
  description: z.string().optional(),
  uses: z.object({
    ui: z.array(z.string()).optional(),
    services: z.array(z.string()).optional(),
    hooks: z.array(z.string()).optional(),
  }).optional(),
  mcp_actions: z.array(z.object({
    key: z.string().regex(/^[a-z0-9_]+$/, 'Must be snake_case'),
    version: z.string().refine((v) => semver.valid(v), 'Must be valid semver'),
    description: z.string().optional(),
    input_schema: z.record(z.any()).optional(),
    output_schema: z.record(z.any()).optional(),
  })).optional(),
});

export async function validateManifest(manifestPath: string) {
  console.log(chalk.blue('Validating manifest:'), manifestPath);
  
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file exists
  if (!fs.existsSync(manifestPath)) {
    console.error(chalk.red('✗ Manifest file not found'));
    process.exit(1);
  }

  // Read and parse
  let manifest: any;
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(content);
  } catch (err) {
    console.error(chalk.red('✗ Failed to parse JSON:'), err);
    process.exit(1);
  }

  // Validate schema
  const result = manifestSchema.safeParse(manifest);
  
  if (!result.success) {
    result.error.errors.forEach((err) => {
      errors.push(`${err.path.join('.')}: ${err.message}`);
    });
  }

  // Additional checks
  if (manifest.mcp_actions) {
    manifest.mcp_actions.forEach((action: any, idx: number) => {
      const fqAction = `${manifest.key}.${action.key}`;
      
      if (!action.input_schema) {
        warnings.push(`mcp_actions[${idx}] (${fqAction}): Missing input_schema`);
      }
      
      if (!action.output_schema) {
        warnings.push(`mcp_actions[${idx}] (${fqAction}): Missing output_schema`);
      }

      // Check for duplicate action keys
      const duplicates = manifest.mcp_actions.filter(
        (a: any) => a.key === action.key
      );
      if (duplicates.length > 1) {
        errors.push(`mcp_actions[${idx}]: Duplicate action key '${action.key}'`);
      }
    });
  }

  // Print results
  const table = new Table({
    head: ['Type', 'Message'],
    colWidths: [10, 80],
  });

  errors.forEach((msg) => {
    table.push([chalk.red('ERROR'), msg]);
  });

  warnings.forEach((msg) => {
    table.push([chalk.yellow('WARN'), msg]);
  });

  if (errors.length > 0 || warnings.length > 0) {
    console.log(table.toString());
  }

  if (errors.length > 0) {
    console.log(chalk.red(`\n✗ Validation failed with ${errors.length} error(s)`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow(`\n⚠ Validation passed with ${warnings.length} warning(s)`));
  } else {
    console.log(chalk.green('\n✓ Manifest is valid'));
  }
}

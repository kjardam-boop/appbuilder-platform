#!/usr/bin/env node
/**
 * Platform App Developer CLI
 * Tools for manifest validation, schema generation, and local testing
 */

import { Command } from 'commander';
import { validateManifest } from './commands/manifest-validate.js';
import { schemaFromZod } from './commands/schema-from-zod.js';
import { appInit } from './commands/app-init.js';
import { mcpRun } from './commands/mcp-run.js';

const program = new Command();

program
  .name('dev-cli')
  .description('Developer toolkit for Platform Apps')
  .version('1.0.0');

program
  .command('manifest:validate')
  .description('Validate app manifest file')
  .argument('<path>', 'Path to manifest file')
  .action(validateManifest);

program
  .command('schema:from-zod')
  .description('Generate JSON Schema from Zod schemas')
  .argument('<src>', 'Source directory with Zod schemas')
  .option('--out <dir>', 'Output directory for JSON schemas', './schemas')
  .option('--update-manifest', 'Update manifest with generated schemas', false)
  .action(schemaFromZod);

program
  .command('app:init')
  .description('Scaffold a new Platform App')
  .argument('<appKey>', 'App key (slug format)')
  .option('--with-actions', 'Include example MCP actions', false)
  .action(appInit);

program
  .command('mcp:run')
  .description('Run MCP action locally')
  .argument('<action>', 'Action name or fq_action')
  .option('--tenant <id>', 'Tenant ID', 'test-tenant')
  .option('--user <id>', 'User ID', 'test-user')
  .option('--data <file>', 'JSON file with payload', 'data.json')
  .option('--registry', 'Use registry (fq_action)', false)
  .action(mcpRun);

program.parse(process.argv);

/**
 * App Scaffolder
 * Creates a new Platform App skeleton
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export async function appInit(appKey: string, options: { withActions: boolean }) {
  console.log(chalk.blue('Initializing new Platform App:'), appKey);

  // Validate app key (slug format)
  if (!/^[a-z0-9-]+$/.test(appKey)) {
    console.error(chalk.red('✗ App key must be a valid slug (lowercase, alphanumeric, hyphens)'));
    process.exit(1);
  }

  const appDir = path.join(process.cwd(), 'packages', 'apps', appKey);

  // Check if directory already exists
  if (fs.existsSync(appDir)) {
    console.error(chalk.red('✗ App directory already exists:'), appDir);
    process.exit(1);
  }

  // Create directory structure
  fs.mkdirSync(path.join(appDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(appDir, 'schemas'), { recursive: true });

  // Create manifest
  const manifest = {
    name: appKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    key: appKey,
    version: '1.0.0',
    description: `Platform app: ${appKey}`,
    uses: {
      ui: [],
      services: [],
      hooks: [],
    },
    mcp_actions: options.withActions ? [
      {
        key: 'example_action',
        version: '1.0.0',
        description: 'Example MCP action',
        input_schema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        },
        output_schema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      },
    ] : [],
  };

  fs.writeFileSync(
    path.join(appDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create index.ts
  const indexContent = `/**
 * ${manifest.name}
 * ${manifest.description}
 */

export const ${appKey.replace(/-/g, '_')}_module = {
  name: '${appKey}',
  version: '${manifest.version}',
  enabled: true,
} as const;
`;

  fs.writeFileSync(path.join(appDir, 'src', 'index.ts'), indexContent);

  // Create example schema if --with-actions
  if (options.withActions) {
    const schemaContent = `import { z } from 'zod';

export const exampleActionInputSchema = z.object({
  input: z.string().min(1),
});

export const exampleActionOutputSchema = z.object({
  result: z.string(),
});

export type ExampleActionInput = z.infer<typeof exampleActionInputSchema>;
export type ExampleActionOutput = z.infer<typeof exampleActionOutputSchema>;
`;

    fs.writeFileSync(path.join(appDir, 'schemas', 'example-action.ts'), schemaContent);
  }

  // Create README
  const readmeContent = `# ${manifest.name}

${manifest.description}

## Version
${manifest.version}

## Development

\`\`\`bash
# Validate manifest
dev-cli manifest:validate packages/apps/${appKey}/manifest.json

# Generate JSON schemas
dev-cli schema:from-zod packages/apps/${appKey}/schemas --out packages/apps/${appKey}/schemas

# Run action locally
dev-cli mcp:run ${appKey}.example_action --data test-data.json
\`\`\`
`;

  fs.writeFileSync(path.join(appDir, 'README.md'), readmeContent);

  console.log(chalk.green('\n✓ App initialized successfully!'));
  console.log(chalk.gray('\nCreated files:'));
  console.log(chalk.gray(`  ${appDir}/manifest.json`));
  console.log(chalk.gray(`  ${appDir}/src/index.ts`));
  console.log(chalk.gray(`  ${appDir}/README.md`));
  
  if (options.withActions) {
    console.log(chalk.gray(`  ${appDir}/schemas/example-action.ts`));
  }

  console.log(chalk.blue('\nNext steps:'));
  console.log(chalk.gray('  1. Edit manifest.json to define your app'));
  console.log(chalk.gray('  2. Implement MCP actions in schemas/'));
  console.log(chalk.gray('  3. Run dev-cli manifest:validate to check your work'));
}

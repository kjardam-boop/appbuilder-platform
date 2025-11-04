# Platform Apps Developer Guide

This guide covers how to create, develop, and test Platform Apps using the developer toolkit.

## Quick Start

### 1. Create a New App

```bash
# Basic app
npx tsx tools/dev-cli/src/cli.ts app:init my-app

# App with example MCP actions
npx tsx tools/dev-cli/src/cli.ts app:init my-app --with-actions
```

This creates:
```
packages/apps/my-app/
├── manifest.json       # App definition
├── src/
│   └── index.ts       # Main module
├── schemas/           # Zod schemas (if --with-actions)
└── README.md
```

### 2. Define Your App

Edit `manifest.json`:

```json
{
  "name": "My App",
  "key": "my-app",
  "version": "1.0.0",
  "description": "Description of my app",
  "uses": {
    "ui": ["react", "tailwind"],
    "services": ["supabase"],
    "hooks": ["useAuth"]
  },
  "mcp_actions": [
    {
      "key": "my_action",
      "version": "1.0.0",
      "description": "My custom action",
      "input_schema": { ... },
      "output_schema": { ... }
    }
  ]
}
```

### 3. Validate Your Manifest

```bash
npx tsx tools/dev-cli/src/cli.ts manifest:validate packages/apps/my-app/manifest.json
```

Output:
```
✓ Manifest is valid
```

## MCP Actions

### Defining Actions

MCP actions allow your app to expose backend functionality. Each action needs:

1. **Key** (snake_case): Unique within your app
2. **Version** (semver): Tracks changes
3. **Input/Output Schemas**: JSON Schema definitions

### Namespacing

Actions are automatically namespaced as `<appKey>.<actionKey>`:

```
my-app.create_scorecard
my-app.generate_report
my-app.send_notification
```

### Using Zod Schemas

Define schemas in TypeScript using Zod:

```typescript
// schemas/create-scorecard.ts
import { z } from 'zod';

export const createScorecardInputSchema = z.object({
  vendor_id: z.string().uuid(),
  criteria: z.array(z.object({
    name: z.string(),
    weight: z.number().min(0).max(100),
  })),
});

export const createScorecardOutputSchema = z.object({
  scorecard_id: z.string().uuid(),
  total_score: z.number(),
});

export type CreateScorecardInput = z.infer<typeof createScorecardInputSchema>;
export type CreateScorecardOutput = z.infer<typeof createScorecardOutputSchema>;
```

### Generate JSON Schema

```bash
npx tsx tools/dev-cli/src/cli.ts schema:from-zod \
  packages/apps/my-app/schemas \
  --out packages/apps/my-app/schemas
```

This generates:
- `createScorecardInput.json`
- `createScorecardOutput.json`

Use `--update-manifest` to automatically update your manifest.json.

## Local Testing

### Run Actions Locally

Create a test data file:

```json
// test-data.json
{
  "vendor_id": "123e4567-e89b-12d3-a456-426614174000",
  "criteria": [
    { "name": "Price", "weight": 30 },
    { "name": "Quality", "weight": 70 }
  ]
}
```

Run the action:

```bash
npx tsx tools/dev-cli/src/cli.ts mcp:run \
  my-app.create_scorecard \
  --tenant test-tenant \
  --user test-user \
  --data test-data.json
```

### Registry Actions

For registered actions (Step 7):

```bash
npx tsx tools/dev-cli/src/cli.ts mcp:run \
  my-app.create_scorecard \
  --registry \
  --data test-data.json
```

## Development Workflow

### 1. Make Changes

Edit your app's code, schemas, or manifest.

### 2. Validate

```bash
# Validate manifest
npx tsx tools/dev-cli/src/cli.ts manifest:validate packages/apps/my-app/manifest.json

# Regenerate schemas
npx tsx tools/dev-cli/src/cli.ts schema:from-zod packages/apps/my-app/schemas --out packages/apps/my-app/schemas
```

### 3. Test Locally

```bash
npx tsx tools/dev-cli/src/cli.ts mcp:run my-app.my_action --data test.json
```

### 4. Commit

Pre-commit hooks will automatically:
- Run lint and typecheck
- Validate changed manifests
- Check schema consistency

### 5. Deploy

CI will validate all manifests and schemas before deployment.

## Best Practices

### Manifest

- ✅ Use semantic versioning
- ✅ Keep action keys in snake_case
- ✅ Provide clear descriptions
- ✅ Define comprehensive schemas

### Schemas

- ✅ Use Zod for type safety
- ✅ Add validation rules (min/max, regex, etc.)
- ✅ Export types for use in code
- ✅ Regenerate JSON schemas after changes

### Testing

- ✅ Test actions locally before deployment
- ✅ Use realistic test data
- ✅ Test error cases
- ✅ Validate input/output schemas

### Versioning

- Increment **patch** for bug fixes
- Increment **minor** for new features
- Increment **major** for breaking changes

## Conventions

### Naming

- **App keys**: `kebab-case` (my-app, vendor-scoring)
- **Action keys**: `snake_case` (create_scorecard, send_email)
- **Schema files**: `kebab-case.ts` (create-scorecard.ts)
- **Schema exports**: `camelCaseSchema` (createScorecardInputSchema)

### File Structure

```
packages/apps/<app-key>/
├── manifest.json           # REQUIRED
├── src/
│   ├── index.ts           # Module entry
│   ├── actions/           # Action implementations
│   └── types/             # TypeScript types
├── schemas/               # Zod schemas
│   ├── <action>.ts
│   └── <action>.json      # Generated
├── tests/                 # Unit tests
└── README.md
```

## CLI Reference

### manifest:validate

Validate app manifest structure and content.

```bash
npx tsx tools/dev-cli/src/cli.ts manifest:validate <path>
```

Checks:
- JSON syntax
- Required fields (name, key, version)
- Semver versions
- Slug format for keys
- Schema presence
- Duplicate action keys

Exit codes:
- `0`: Valid
- `1`: Errors found

### schema:from-zod

Generate JSON schemas from Zod definitions.

```bash
npx tsx tools/dev-cli/src/cli.ts schema:from-zod <src> \
  --out <dir> \
  [--update-manifest]
```

Options:
- `--out`: Output directory (default: ./schemas)
- `--update-manifest`: Update manifest.json with generated schemas

### app:init

Scaffold a new Platform App.

```bash
npx tsx tools/dev-cli/src/cli.ts app:init <appKey> [--with-actions]
```

Options:
- `--with-actions`: Include example MCP actions

### mcp:run

Run MCP action locally.

```bash
npx tsx tools/dev-cli/src/cli.ts mcp:run <action> \
  --tenant <id> \
  --user <id> \
  --data <file> \
  [--registry]
```

Options:
- `--tenant`: Tenant ID (default: test-tenant)
- `--user`: User ID (default: test-user)
- `--data`: JSON file with payload (default: data.json)
- `--registry`: Use registry lookup (for fq_action)

## Troubleshooting

### Manifest Validation Fails

**Error**: "Must be valid slug"
- Solution: Use lowercase, alphanumeric, and hyphens only

**Error**: "Must be valid semver"
- Solution: Use format `X.Y.Z` (e.g., 1.0.0)

**Error**: "Duplicate action key"
- Solution: Each action key must be unique within the app

### Schema Generation Issues

**Error**: "Schema not found"
- Solution: Ensure schema exports match naming convention (`*Schema`)

**Error**: "Invalid Zod schema"
- Solution: Check Zod syntax and imports

### Local Runner Issues

**Error**: "Data file not found"
- Solution: Check file path and permissions

**Error**: "Not implemented"
- Solution: Local runner is a placeholder; connect to McpActionService

## Next Steps

- Read [MCP Policy Guide](./mcp-policy.md)
- Review [Integration Patterns](./integrations.md)
- Explore [Example Apps](../../packages/apps/)

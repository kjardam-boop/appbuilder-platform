/**
 * Zod to JSON Schema Generator
 * Converts exported Zod schemas to JSON Schema files
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import zodToJsonSchema from 'zod-to-json-schema';

export async function schemaFromZod(
  srcDir: string,
  options: { out: string; updateManifest: boolean }
) {
  console.log(chalk.blue('Generating JSON schemas from Zod...'));
  console.log('Source:', srcDir);
  console.log('Output:', options.out);

  // Ensure output directory exists
  if (!fs.existsSync(options.out)) {
    fs.mkdirSync(options.out, { recursive: true });
  }

  // Find all TypeScript files with schemas
  const files = await glob(`${srcDir}/**/*.ts`);
  
  let generatedCount = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Simple regex to find exported Zod schemas (convention: ends with "Schema")
    const schemaPattern = /export\s+const\s+(\w+Schema)\s*=/g;
    let match;
    
    while ((match = schemaPattern.exec(content)) !== null) {
      const schemaName = match[1];
      const outputFile = path.join(
        options.out,
        `${schemaName.replace(/Schema$/, '')}.json`
      );

      console.log(chalk.gray(`Found: ${schemaName} → ${path.basename(outputFile)}`));

      // Note: This is a placeholder. In a real implementation, you'd need to:
      // 1. Dynamically import the TypeScript file
      // 2. Get the actual Zod schema object
      // 3. Convert it using zodToJsonSchema
      // For now, we'll create a placeholder
      
      const placeholderSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        description: `Generated from ${schemaName}`,
        note: 'This is a placeholder. Real implementation requires dynamic import.',
      };

      fs.writeFileSync(outputFile, JSON.stringify(placeholderSchema, null, 2));
      generatedCount++;
    }
  }

  console.log(chalk.green(`\n✓ Generated ${generatedCount} JSON schema(s)`));

  if (options.updateManifest) {
    console.log(chalk.yellow('Note: --update-manifest requires manifest path'));
  }
}

#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to scan for documentation
const SCAN_PATHS = [
  path.join(__dirname, '../public/docs'),
  path.join(__dirname, '../docs'),
  path.join(__dirname, '../src/modules/core'),
];

const OUTPUT_FILE = path.join(__dirname, '../src/config/documentationCatalog.ts');

// Path-based category mapping (most specific first)
const PATH_CATEGORY_MAP = {
  'docs/capabilities': { category: 'Capabilities', subcategory: null },
  'docs/dev': { category: 'Development', subcategory: 'Guides' },
  'docs/templates': { category: 'Templates', subcategory: null },
  'src/modules/core/ai': { category: 'Modules', subcategory: 'AI' },
  'src/modules/core/applications': { category: 'Modules', subcategory: 'Applications' },
  'src/modules/core/compliance': { category: 'Modules', subcategory: 'Compliance' },
  'src/modules/core/company': { category: 'Modules', subcategory: 'Company' },
  'src/modules/core/document': { category: 'Modules', subcategory: 'Document' },
  'src/modules/core/industry': { category: 'Modules', subcategory: 'Industry' },
  'src/modules/core/integrations': { category: 'Modules', subcategory: 'Integrations' },
  'src/modules/core/project': { category: 'Modules', subcategory: 'Project' },
  'src/modules/core/supplier': { category: 'Modules', subcategory: 'Supplier' },
  'src/modules/core/tasks': { category: 'Modules', subcategory: 'Tasks' },
  'src/modules/core/tenant': { category: 'Modules', subcategory: 'Tenant' },
  'src/modules/core/user': { category: 'Modules', subcategory: 'User' },
};

// Fallback keyword-based category mapping
const KEYWORD_CATEGORY_MAP = {
  'database': 'Architecture',
  'tenant': 'Architecture',
  'architecture': 'Architecture',
  'naming': 'Architecture',
  'app': 'Platform',
  'platform': 'Platform',
  'operation': 'Platform',
  'admin': 'Platform',
  'permission': 'Platform',
  'role': 'Platform',
  'test': 'Development',
  'development': 'Development',
  'implementation': 'Implementation',
  'sprint': 'Implementation',
  'summary': 'Implementation',
  'readme': 'Platform',
  'capability': 'Capabilities',
  'template': 'Templates',
  'module': 'Modules',
};

function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) return null;
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
    
    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    } else {
      frontmatter[key] = value;
    }
  }
  
  return frontmatter;
}

function parseMarkdown(content, filename) {
  const frontmatter = parseFrontmatter(content);
  
  const lines = content.split('\n');
  let title = filename.replace(/\.md$/, '').replace(/-/g, ' ');
  let description = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '');
      
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const descLine = lines[j].trim();
        if (descLine && !descLine.startsWith('#') && !descLine.startsWith('```')) {
          if (descLine !== '---' && descLine.length > 10) {
            description = descLine.replace(/\*\*/g, '').replace(/\*/g, '').substring(0, 150);
            break;
          }
        }
      }
      break;
    }
  }
  
  return { 
    title: frontmatter?.title || title, 
    description: frontmatter?.description || description,
    frontmatter 
  };
}

function determineCategoryAndSubcategory(relativePath, filename, frontmatter) {
  if (frontmatter?.category) {
    return {
      category: frontmatter.category,
      subcategory: frontmatter.subcategory || null
    };
  }
  
  const normalizedPath = relativePath.replace(/\\/g, '/');
  
  for (const [pathPattern, categoryInfo] of Object.entries(PATH_CATEGORY_MAP)) {
    if (normalizedPath.includes(pathPattern)) {
      return categoryInfo;
    }
  }
  
  const lowerName = filename.toLowerCase();
  
  for (const [keyword, category] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (lowerName.includes(keyword)) {
      return { category, subcategory: null };
    }
  }
  
  return { category: 'Platform', subcategory: null };
}

function generateTags(filename, frontmatter) {
  if (frontmatter?.tags && Array.isArray(frontmatter.tags)) {
    return frontmatter.tags;
  }
  
  const tags = filename
    .replace(/\.md$/, '')
    .split(/[-_]/)
    .filter(tag => tag.length > 2)
    .map(tag => tag.toLowerCase());
  
  return tags.slice(0, 4);
}

function getLastModified(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

function scanDirectory(dir, baseDir = null) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const effectiveBaseDir = baseDir || dir;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name.startsWith('.'))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath, effectiveBaseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relativePath = path.relative(effectiveBaseDir, fullPath);
      const sourcePath = path.relative(path.join(__dirname, '..'), fullPath);
      
      files.push({
        filename: entry.name,
        fullPath,
        relativePath: relativePath.replace(/\\/g, '/'),
        sourcePath: sourcePath.replace(/\\/g, '/'),
      });
    }
  }
  
  return files;
}

function scanAllPaths() {
  const allFiles = [];
  
  for (const scanPath of SCAN_PATHS) {
    const files = scanDirectory(scanPath);
    allFiles.push(...files);
  }
  
  return allFiles;
}

function generateCatalog() {
  console.log('🔍 Scanning for documentation files...');
  
  const files = scanAllPaths();
  
  if (files.length === 0) {
    console.warn('⚠️  No markdown files found');
    return;
  }
  
  console.log(`📄 Found ${files.length} documentation files`);
  
  const catalog = files.map((file) => {
    const content = fs.readFileSync(file.fullPath, 'utf-8');
    const { title, description, frontmatter } = parseMarkdown(content, file.filename);
    const { category, subcategory } = determineCategoryAndSubcategory(
      file.sourcePath, 
      file.filename, 
      frontmatter
    );
    const tags = generateTags(file.filename, frontmatter);
    const lastModified = getLastModified(file.fullPath);
    
    const id = file.sourcePath
      .replace(/\.md$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    
    return {
      id,
      title,
      description: description || `Documentation for ${title}`,
      category,
      subcategory,
      path: file.sourcePath,
      source: file.sourcePath,
      tags,
      lastUpdated: lastModified,
    };
  });
  
  catalog.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    if (a.subcategory !== b.subcategory) {
      if (!a.subcategory) return 1;
      if (!b.subcategory) return -1;
      return a.subcategory.localeCompare(b.subcategory);
    }
    return a.title.localeCompare(b.title);
  });
  
  const tsContent = `/**
 * Documentation Catalog
 * 
 * Auto-generated by scripts/generate-docs-catalog.js
 * DO NOT EDIT MANUALLY - Run 'npm run generate:docs' to regenerate
 * 
 * Last generated: ${new Date().toISOString()}
 */

export interface DocumentMetadata {
  id: string;
  title: string;
  description: string;
  category: 'Platform' | 'Architecture' | 'Development' | 'Implementation' | 'Modules' | 'Capabilities' | 'Templates';
  subcategory?: string;
  path: string;
  source?: string;
  tags?: string[];
  lastUpdated?: string;
}

export const documentationCatalog: DocumentMetadata[] = ${JSON.stringify(catalog, null, 2)};
`;
  
  fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');
  
  console.log('✅ Documentation catalog generated successfully!');
  console.log(`📝 Output: ${OUTPUT_FILE}`);
  console.log(`📊 Total entries: ${catalog.length}`);
  
  const categoryCount = catalog.reduce((acc, doc) => {
    const key = doc.subcategory ? `${doc.category} > ${doc.subcategory}` : doc.category;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📋 Summary by category:');
  Object.entries(categoryCount)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
}

try {
  generateCatalog();
} catch (error) {
  console.error('❌ Error generating catalog:', error);
  process.exit(1);
}

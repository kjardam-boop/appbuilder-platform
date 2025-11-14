#!/usr/bin/env node

/**
 * Automated Breadcrumb Addition Script
 * 
 * This script automatically adds breadcrumb imports and components to pages
 * that are missing them.
 * 
 * Usage: node scripts/add-breadcrumbs.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// Pages that need breadcrumbs (from audit)
const PAGES_TO_UPDATE = {
  // Root pages
  'src/pages/AdminQuestions.tsx': { category: 'Operations', name: 'Questions' },
  'src/pages/AdminSeed.tsx': { category: 'Operations', name: 'Seed Data' },
  'src/pages/ApplicationsPage.tsx': { category: 'Content', name: 'Applications' },
  'src/pages/AppsPage.tsx': { category: 'Content', name: 'Apps' },
  'src/pages/ArchivedResources.tsx': { category: 'Operations', name: 'Archived Resources' },
  'src/pages/CompanyIntegrations.tsx': { category: 'Business', name: 'Integrations', parent: 'Companies' },
  'src/pages/CompaniesHub.tsx': { category: 'Business', name: 'Companies' },
  'src/pages/Dashboard.tsx': { type: 'dashboard' },
  'src/pages/IndustryAdmin.tsx': { category: 'Content', name: 'Industries' },
  'src/pages/Modules.tsx': { category: 'Platform', name: 'Modules' },
  'src/pages/OpportunitiesPage.tsx': { type: 'business', section: 'Opportunities' },
  'src/pages/OpportunityDetails.tsx': { type: 'business', section: 'Opportunities', detail: true },
  'src/pages/ProjectsHub.tsx': { type: 'business', section: 'Projects' },
  'src/pages/SupplierScoringPage.tsx': { type: 'business', section: 'Suppliers', name: 'Scoring' },
  'src/pages/VendorDetailsPage.tsx': { type: 'business', section: 'Vendors', detail: true },
  
  // Admin pages
  'src/pages/admin/AdminBootstrap.tsx': { category: 'Operations', name: 'Bootstrap' },
  'src/pages/admin/AdminCompanies.tsx': { category: 'Platform', name: 'Companies' },
  'src/pages/admin/AIMcpDemo.tsx': { category: 'AI', name: 'MCP Demo' },
  'src/pages/admin/AIPolicySettings.tsx': { category: 'AI', name: 'Policy Settings' },
  'src/pages/admin/AIProviderHealth.tsx': { category: 'AI', name: 'Provider Health' },
  'src/pages/admin/AIProviderSettings.tsx': { category: 'AI', name: 'Provider Settings' },
  'src/pages/admin/AIUsageDashboard.tsx': { category: 'AI', name: 'Usage Dashboard' },
  'src/pages/admin/AppCatalog.tsx': { category: 'Content', name: 'App Catalog' },
  'src/pages/admin/AppDefinitionCreate.tsx': { category: 'Content', name: 'Create App' },
  'src/pages/admin/AppDefinitionDetails.tsx': { category: 'Content', name: 'App Details', detail: true },
  'src/pages/admin/ApplicationCreate.tsx': { category: 'Content', name: 'Create Application' },
  'src/pages/admin/AppVersionsPage.tsx': { category: 'Content', name: 'App Versions' },
  'src/pages/admin/Categories.tsx': { category: 'Content', name: 'Categories' },
  'src/pages/admin/Compatibility.tsx': { category: 'Integrations', name: 'Compatibility' },
  'src/pages/admin/CredentialsPage.tsx': { category: 'Integrations', name: 'Credentials' },
  'src/pages/admin/DatabaseNamingValidation.tsx': { category: 'Operations', name: 'Database Naming' },
  'src/pages/admin/IntegrationGraph.tsx': { category: 'Integrations', name: 'Integration Graph' },
  'src/pages/admin/IntegrationRecommendations.tsx': { category: 'Integrations', name: 'Recommendations' },
  'src/pages/admin/McpObservability.tsx': { category: 'Integrations', subcategory: 'MCP', name: 'Observability' },
  'src/pages/admin/McpPolicy.tsx': { category: 'Integrations', subcategory: 'MCP', name: 'Policy' },
  'src/pages/admin/McpSecrets.tsx': { category: 'Integrations', subcategory: 'MCP', name: 'Secrets' },
  'src/pages/admin/McpWorkflows.tsx': { category: 'Integrations', subcategory: 'MCP', name: 'Workflows' },
  'src/pages/admin/PerformanceTest.tsx': { category: 'Operations', name: 'Performance Test' },
  'src/pages/admin/PermissionHealth.tsx': { category: 'Platform', name: 'Permission Health' },
  'src/pages/admin/PlatformInvitationsPage.tsx': { category: 'Platform', name: 'Invitations' },
  'src/pages/admin/RoleConfiguration.tsx': { category: 'Platform', name: 'Role Configuration' },
  'src/pages/admin/TenantAppCatalog.tsx': { category: 'Tenants', name: 'App Catalog' },
  'src/pages/admin/TenantSystems.tsx': { category: 'Tenants', name: 'Systems' },
};

const IMPORT_STATEMENTS = `import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';`;

function generateBreadcrumbCode(config) {
  if (config.type === 'dashboard') {
    return '<AppBreadcrumbs customLabel="Dashboard" />';
  }
  
  if (config.type === 'business') {
    if (config.detail) {
      return `<AppBreadcrumbs levels={[
  { label: "Dashboard", href: "/dashboard" },
  { label: "${config.section}", href: "/${config.section.toLowerCase()}" },
  { label: "Details" }
]} />`;
    }
    return `<AppBreadcrumbs levels={[
  { label: "Dashboard", href: "/dashboard" },
  { label: "${config.section}" }
]} />`;
  }
  
  // Admin pages
  let code = 'generateAdminBreadcrumbs({\n';
  if (config.category) {
    code += `  category: "${config.category}",\n`;
  }
  if (config.subcategory) {
    code += `  subcategory: "${config.subcategory}",\n`;
  }
  code += `  currentPage: "${config.name}"\n`;
  code += '})';
  
  return `<AppBreadcrumbs levels={${code}} />`;
}

function hasAppBreadcrumbs(content) {
  return content.includes('AppBreadcrumbs') || content.includes('app-breadcrumbs');
}

function addImports(content) {
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex === -1) {
    // No imports found, add at top
    return IMPORT_STATEMENTS + '\n\n' + content;
  }
  
  // Insert after last import
  lines.splice(lastImportIndex + 1, 0, IMPORT_STATEMENTS);
  return lines.join('\n');
}

function addBreadcrumb(content, breadcrumbCode) {
  // Find the return statement with JSX
  const returnMatch = content.match(/return\s*\(/);
  if (!returnMatch) {
    console.warn('  ⚠️  Could not find return statement');
    return null;
  }
  
  const returnIndex = returnMatch.index + returnMatch[0].length;
  
  // Find the first opening tag after return
  const afterReturn = content.substring(returnIndex);
  const firstTagMatch = afterReturn.match(/<(\w+)[>\s]/);
  
  if (!firstTagMatch) {
    console.warn('  ⚠️  Could not find JSX after return');
    return null;
  }
  
  const insertPosition = returnIndex + firstTagMatch.index + firstTagMatch[0].length;
  
  // Check indentation
  const lineStart = content.lastIndexOf('\n', insertPosition);
  const indentMatch = content.substring(lineStart + 1, insertPosition).match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '      ';
  
  // Insert breadcrumb after opening tag
  const before = content.substring(0, insertPosition);
  const after = content.substring(insertPosition);
  
  return before + '\n' + indent + breadcrumbCode + '\n' + indent + after;
}

function processFile(filePath, config) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skip: ${filePath} (file not found)`);
    return { skipped: true };
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already has breadcrumbs
  if (hasAppBreadcrumbs(content)) {
    console.log(`✅ Already has breadcrumbs: ${filePath}`);
    return { skipped: true, reason: 'already has breadcrumbs' };
  }
  
  // Add imports
  content = addImports(content);
  
  // Generate breadcrumb code
  const breadcrumbCode = generateBreadcrumbCode(config);
  
  // Add breadcrumb to JSX
  const newContent = addBreadcrumb(content, breadcrumbCode);
  
  if (!newContent) {
    return { failed: true };
  }
  
  if (DRY_RUN) {
    console.log(`🔍 Dry run: Would update ${filePath}`);
    console.log(`   Breadcrumb: ${breadcrumbCode}`);
    return { dryRun: true };
  }
  
  // Write file
  fs.writeFileSync(fullPath, newContent, 'utf8');
  console.log(`✅ Updated: ${filePath}`);
  
  return { updated: true };
}

function main() {
  console.log('🚀 Automated Breadcrumb Addition Script\n');
  
  if (DRY_RUN) {
    console.log('📝 DRY RUN MODE - No files will be modified\n');
  }
  
  const stats = {
    updated: 0,
    skipped: 0,
    failed: 0,
    total: Object.keys(PAGES_TO_UPDATE).length
  };
  
  for (const [filePath, config] of Object.entries(PAGES_TO_UPDATE)) {
    const result = processFile(filePath, config);
    
    if (result.updated) stats.updated++;
    if (result.skipped) stats.skipped++;
    if (result.failed) stats.failed++;
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total pages: ${stats.total}`);
  console.log(`   ✅ Updated: ${stats.updated}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  
  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✨ Done! Remember to test the changes.');
  }
}

main();

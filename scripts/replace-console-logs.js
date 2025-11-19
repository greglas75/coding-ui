#!/usr/bin/env node
/**
 * Automatic Console.log Replacement Script
 * Replaces console.log/warn/error with structured logger calls
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Files to skip
const SKIP_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'backups',
  'python-service/venv',
  'scripts/replace-console-logs.js', // Don't replace in this file!
];

// Backend files (use utils/logger.js)
const BACKEND_PATTERNS = [
  /^services\//,
  /^routes\//,
  /^middleware\//,
  /^utils\//,
  /^server\//,
  /api-server/,
];

// Frontend files (use src/utils/logger.ts)
const FRONTEND_PATTERNS = [
  /^src\//,
];

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: 0,
  errors: [],
};

/**
 * Check if file should be skipped
 */
function shouldSkip(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  return SKIP_PATTERNS.some(pattern => relativePath.includes(pattern));
}

/**
 * Determine if file is backend or frontend
 */
function getFileType(filePath) {
  const relativePath = path.relative(rootDir, filePath);

  if (BACKEND_PATTERNS.some(pattern => pattern.test(relativePath))) {
    return 'backend';
  }

  if (FRONTEND_PATTERNS.some(pattern => pattern.test(relativePath))) {
    return 'frontend';
  }

  // Default to backend for root-level .js files
  if (filePath.endsWith('.js') && !filePath.includes('/src/')) {
    return 'backend';
  }

  return null; // Skip unknown files
}

/**
 * Replace console.log with logger in backend files
 */
function replaceBackendConsole(content, filePath) {
  let modified = content;
  let hasChanges = false;
  let count = 0;

  // Check if logger is already imported
  const hasLoggerImport = /import.*logger.*from.*['"](\.\.\/)*utils\/logger/.test(modified);

  // Replace console.log patterns
  const patterns = [
    // console.log('message', data)
    {
      regex: /console\.log\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `logger.info(${args});`;
      },
    },
    // console.warn
    {
      regex: /console\.warn\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `logger.warn(${args});`;
      },
    },
    // console.error
    {
      regex: /console\.error\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `logger.error(${args});`;
      },
    },
    // console.debug
    {
      regex: /console\.debug\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `logger.debug(${args});`;
      },
    },
  ];

  patterns.forEach(({ regex, replacement }) => {
    if (regex.test(modified)) {
      modified = modified.replace(regex, replacement);
      hasChanges = true;
    }
  });

  // Add logger import if changes were made and import doesn't exist
  if (hasChanges && !hasLoggerImport) {
    // Determine import path depth
    const depth = (filePath.match(/\//g) || []).length - 1;
    const importPath = '../'.repeat(Math.max(1, depth - 1)) + 'utils/logger.js';

    // Find the last import statement
    const importRegex = /^import .+ from .+;$/gm;
    const imports = [...modified.matchAll(importRegex)];

    if (imports.length > 0) {
      // Add after last import
      const lastImport = imports[imports.length - 1];
      const insertPos = lastImport.index + lastImport[0].length;
      modified =
        modified.slice(0, insertPos) +
        `\nimport logger from '${importPath}';` +
        modified.slice(insertPos);
    } else {
      // Add at the beginning (after comments)
      const lines = modified.split('\n');
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('//') || lines[i].trim().startsWith('/*') || lines[i].trim() === '') {
          insertIndex = i + 1;
        } else {
          break;
        }
      }
      lines.splice(insertIndex, 0, `import logger from '${importPath}';`, '');
      modified = lines.join('\n');
    }
  }

  return { modified, count, hasChanges };
}

/**
 * Replace console.log with logger in frontend files
 */
function replaceFrontendConsole(content) {
  let modified = content;
  let hasChanges = false;
  let count = 0;

  // Check if logger is already imported
  const hasLoggerImport = /import.*logger.*from.*['"].*utils\/logger/.test(modified);

  // Use simpleLogger for frontend (already exists in src/utils/logger.ts)
  const patterns = [
    {
      regex: /console\.log\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `simpleLogger.log(${args});`;
      },
    },
    {
      regex: /console\.warn\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `simpleLogger.warn(${args});`;
      },
    },
    {
      regex: /console\.error\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `simpleLogger.error(${args});`;
      },
    },
    {
      regex: /console\.debug\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `simpleLogger.info(${args});`;
      },
    },
    {
      regex: /console\.info\(([^)]+)\);?/g,
      replacement: (match, args) => {
        count++;
        return `simpleLogger.info(${args});`;
      },
    },
  ];

  patterns.forEach(({ regex, replacement }) => {
    if (regex.test(modified)) {
      modified = modified.replace(regex, replacement);
      hasChanges = true;
    }
  });

  // Add logger import if changes were made and import doesn't exist
  if (hasChanges && !hasLoggerImport) {
    // Find the last import statement
    const importRegex = /^import .+ from .+;$/gm;
    const imports = [...modified.matchAll(importRegex)];

    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const insertPos = lastImport.index + lastImport[0].length;
      modified =
        modified.slice(0, insertPos) +
        `\nimport { simpleLogger } from '@/utils/logger';` +
        modified.slice(insertPos);
    } else {
      modified = `import { simpleLogger } from '@/utils/logger';\n\n` + modified;
    }
  }

  return { modified, count, hasChanges };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesProcessed++;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileType = getFileType(filePath);

    if (!fileType) {
      return; // Skip unknown file types
    }

    const result =
      fileType === 'backend'
        ? replaceBackendConsole(content, filePath)
        : replaceFrontendConsole(content);

    if (result.hasChanges) {
      fs.writeFileSync(filePath, result.modified, 'utf8');
      stats.filesModified++;
      stats.replacements += result.count;
      console.log(`✅ ${path.relative(rootDir, filePath)} - ${result.count} replacements`);
    }
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
  }
}

/**
 * Walk directory recursively
 */
function walkDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);

    if (shouldSkip(filePath)) {
      return;
    }

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (/\.(js|ts|tsx|jsx)$/.test(file)) {
      processFile(filePath);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════════════════

console.log('🚀 Starting console.log replacement...\n');

walkDirectory(rootDir);

console.log('\n📊 Summary:');
console.log(`  Files processed: ${stats.filesProcessed}`);
console.log(`  Files modified: ${stats.filesModified}`);
console.log(`  Total replacements: ${stats.replacements}`);

if (stats.errors.length > 0) {
  console.log(`\n❌ Errors: ${stats.errors.length}`);
  stats.errors.forEach(({ file, error }) => {
    console.log(`  - ${path.relative(rootDir, file)}: ${error}`);
  });
}

console.log('\n✅ Done!');

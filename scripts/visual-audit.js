#!/usr/bin/env node

/**
 * Visual Audit Script
 * 
 * Analyzes CSS files to detect potential visual consistency issues:
 * - Hardcoded colors (not using CSS variables)
 * - Missing variable definitions
 * - Inconsistent spacing values
 * 
 * Run with: node scripts/visual-audit.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Log with color
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Extract CSS variables from variables.css
 */
function extractCSSVariables(cssContent) {
  const variableRegex = /--([a-z0-9-]+):\s*([^;]+);/gi;
  const variables = new Map();
  let match;
  
  while ((match = variableRegex.exec(cssContent)) !== null) {
    variables.set(`--${match[1]}`, match[2].trim());
  }
  
  return variables;
}

/**
 * Find hardcoded hex colors in CSS
 */
function findHardcodedColors(cssContent, filePath) {
  const issues = [];
  
  // Match hex colors that are NOT inside var() or inside :root
  const lines = cssContent.split('\n');
  let inRoot = false;
  let inDarkMode = false;
  
  lines.forEach((line, index) => {
    // Track if we're inside :root or [data-theme="dark"]
    if (line.includes(':root')) inRoot = true;
    if (line.includes('[data-theme="dark"]')) inDarkMode = true;
    if ((inRoot || inDarkMode) && line.includes('}')) {
      inRoot = false;
      inDarkMode = false;
    }
    
    // Skip lines inside variable definitions
    if (inRoot || inDarkMode) return;
    
    // Skip comments
    if (line.trim().startsWith('/*') || line.trim().startsWith('*') || line.trim().startsWith('//')) return;
    
    // Find hex colors
    const hexMatches = line.match(/#[0-9a-f]{6}|#[0-9a-f]{3}/gi);
    if (hexMatches) {
      hexMatches.forEach(color => {
        // Check if it's not inside a var() reference
        if (!line.includes('var(') || line.indexOf(color) < line.indexOf('var(')) {
          issues.push({
            file: filePath,
            line: index + 1,
            color,
            lineContent: line.trim(),
          });
        }
      });
    }
    
    // Find rgb/rgba colors not in variables
    const rgbMatches = line.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/gi);
    if (rgbMatches && !line.includes('var(--')) {
      rgbMatches.forEach(color => {
        issues.push({
          file: filePath,
          line: index + 1,
          color: color.substring(0, 30) + '...',
          lineContent: line.trim(),
        });
      });
    }
  });
  
  return issues;
}

/**
 * Find hardcoded spacing values
 */
function findHardcodedSpacing(cssContent, filePath) {
  const issues = [];
  const lines = cssContent.split('\n');
  let inRoot = false;
  
  // Common spacing properties
  const spacingProperties = ['padding', 'margin', 'gap', 'top', 'right', 'bottom', 'left'];
  
  lines.forEach((line, index) => {
    if (line.includes(':root')) inRoot = true;
    if (inRoot && line.includes('}')) inRoot = false;
    if (inRoot) return;
    
    // Skip comments
    if (line.trim().startsWith('/*') || line.trim().startsWith('*')) return;
    
    // Check for hardcoded pixel values in spacing properties
    spacingProperties.forEach(prop => {
      const propRegex = new RegExp(`${prop}[^:]*:\\s*([^;]+)`, 'i');
      const match = line.match(propRegex);
      
      if (match) {
        const value = match[1];
        // Check for pixel values that aren't using variables
        if (/\d+px/.test(value) && !value.includes('var(')) {
          // Allow 0px, 1px, 2px for borders, and common values
          const pixelValue = parseInt(value.match(/(\d+)px/)[1], 10);
          if (pixelValue > 4 && pixelValue !== 8 && pixelValue !== 16 && pixelValue !== 24 && pixelValue !== 32) {
            issues.push({
              file: filePath,
              line: index + 1,
              property: prop,
              value: value.trim(),
            });
          }
        }
      }
    });
  });
  
  return issues;
}

/**
 * Check for missing var() references
 */
function findMissingVarReferences(cssContent, definedVariables, filePath) {
  const issues = [];
  const varRefRegex = /var\(--([a-z0-9-]+)\)/gi;
  const lines = cssContent.split('\n');
  let match;
  
  lines.forEach((line, index) => {
    while ((match = varRefRegex.exec(line)) !== null) {
      const varName = `--${match[1]}`;
      if (!definedVariables.has(varName)) {
        issues.push({
          file: filePath,
          line: index + 1,
          variable: varName,
        });
      }
    }
  });
  
  return issues;
}

/**
 * Main audit function
 */
async function runAudit() {
  console.log('\n========================================');
  log('  VISUAL CONSISTENCY AUDIT', 'cyan');
  console.log('========================================\n');
  
  // Load variables.css
  const variablesPath = path.join(rootDir, 'css', 'variables.css');
  let definedVariables = new Map();
  
  try {
    const variablesContent = fs.readFileSync(variablesPath, 'utf-8');
    definedVariables = extractCSSVariables(variablesContent);
    log(`✓ Loaded ${definedVariables.size} CSS variables from variables.css`, 'green');
  } catch (error) {
    log(`✗ Could not load variables.css: ${error.message}`, 'red');
    return;
  }
  
  // Find all CSS files
  const cssDir = path.join(rootDir, 'css');
  let cssFiles = [];
  
  try {
    cssFiles = fs.readdirSync(cssDir)
      .filter(f => f.endsWith('.css'))
      .map(f => path.join(cssDir, f));
    log(`✓ Found ${cssFiles.length} CSS files to audit\n`, 'green');
  } catch (error) {
    log(`✗ Could not read CSS directory: ${error.message}`, 'red');
    return;
  }
  
  // Collect all issues
  const allColorIssues = [];
  const allSpacingIssues = [];
  const allMissingVarIssues = [];
  
  // Audit each CSS file
  cssFiles.forEach(filePath => {
    const fileName = path.basename(filePath);
    
    // Skip variables.css
    if (fileName === 'variables.css') return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find issues
      const colorIssues = findHardcodedColors(content, fileName);
      const spacingIssues = findHardcodedSpacing(content, fileName);
      const missingVarIssues = findMissingVarReferences(content, definedVariables, fileName);
      
      allColorIssues.push(...colorIssues);
      allSpacingIssues.push(...spacingIssues);
      allMissingVarIssues.push(...missingVarIssues);
      
    } catch (error) {
      log(`  ⚠ Could not read ${fileName}: ${error.message}`, 'yellow');
    }
  });
  
  // Report results
  console.log('----------------------------------------');
  log('HARDCODED COLORS', 'cyan');
  console.log('----------------------------------------');
  
  if (allColorIssues.length === 0) {
    log('✓ No hardcoded colors found outside variable definitions', 'green');
  } else {
    log(`⚠ Found ${allColorIssues.length} potential hardcoded colors:\n`, 'yellow');
    
    // Group by file
    const byFile = {};
    allColorIssues.forEach(issue => {
      if (!byFile[issue.file]) byFile[issue.file] = [];
      byFile[issue.file].push(issue);
    });
    
    Object.entries(byFile).forEach(([file, issues]) => {
      log(`  ${file}:`, 'dim');
      issues.slice(0, 5).forEach(issue => {
        console.log(`    Line ${issue.line}: ${issue.color}`);
      });
      if (issues.length > 5) {
        console.log(`    ... and ${issues.length - 5} more`);
      }
    });
  }
  
  console.log('\n----------------------------------------');
  log('HARDCODED SPACING', 'cyan');
  console.log('----------------------------------------');
  
  if (allSpacingIssues.length === 0) {
    log('✓ No unusual hardcoded spacing values found', 'green');
  } else {
    log(`⚠ Found ${allSpacingIssues.length} potential hardcoded spacing values:\n`, 'yellow');
    
    allSpacingIssues.slice(0, 10).forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.property}: ${issue.value}`);
    });
    if (allSpacingIssues.length > 10) {
      console.log(`  ... and ${allSpacingIssues.length - 10} more`);
    }
  }
  
  console.log('\n----------------------------------------');
  log('MISSING VARIABLE REFERENCES', 'cyan');
  console.log('----------------------------------------');
  
  if (allMissingVarIssues.length === 0) {
    log('✓ All var() references point to defined variables', 'green');
  } else {
    log(`✗ Found ${allMissingVarIssues.length} references to undefined variables:\n`, 'red');
    
    allMissingVarIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.variable}`);
    });
  }
  
  // Summary
  console.log('\n========================================');
  log('SUMMARY', 'cyan');
  console.log('========================================');
  
  const totalIssues = allColorIssues.length + allSpacingIssues.length + allMissingVarIssues.length;
  
  if (totalIssues === 0) {
    log('\n✓ No visual consistency issues detected!', 'green');
  } else {
    console.log(`\nTotal potential issues: ${totalIssues}`);
    console.log(`  - Hardcoded colors: ${allColorIssues.length}`);
    console.log(`  - Hardcoded spacing: ${allSpacingIssues.length}`);
    console.log(`  - Missing variables: ${allMissingVarIssues.length}`);
    
    if (allMissingVarIssues.length > 0) {
      log('\n⚠ Missing variable references should be fixed!', 'red');
    }
  }
  
  console.log('\n');
  
  // Return exit code based on critical issues
  return allMissingVarIssues.length > 0 ? 1 : 0;
}

// Run the audit
runAudit().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Audit failed:', error);
  process.exit(1);
});

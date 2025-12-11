#!/usr/bin/env node

/**
 * Phase 5 Validation Script
 * 
 * Validates that all Phase 5 requirements are implemented correctly
 * Run with: node scripts/validate-phase5.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Phase5Validator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.passed = [];
        this.basePath = path.join(__dirname, '..');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    }

    error(message) {
        this.errors.push(message);
        this.log(message, 'error');
    }

    warning(message) {
        this.warnings.push(message);
        this.log(message, 'warning');
    }

    pass(message) {
        this.passed.push(message);
        this.log(message, 'pass');
    }

    fileExists(filePath) {
        const fullPath = path.join(this.basePath, filePath);
        return fs.existsSync(fullPath);
    }

    readFile(filePath) {
        const fullPath = path.join(this.basePath, filePath);
        try {
            return fs.readFileSync(fullPath, 'utf8');
        } catch (error) {
            return null;
        }
    }

    validateMainJS() {
        this.log('Validating main.js (Phase 5.1)...');
        
        if (!this.fileExists('js/main.js')) {
            this.error('main.js not found');
            return;
        }

        const content = this.readFile('js/main.js');
        
        // Check for required imports
        const requiredImports = [
            'state.js',
            'handlers.js',
            'ui.js',
            'phase4-ui-renderers.js'
        ];

        requiredImports.forEach(importFile => {
            if (content.includes(importFile)) {
                this.pass(`main.js imports ${importFile}`);
            } else {
                this.error(`main.js missing import: ${importFile}`);
            }
        });

        // Check for initializeApp function
        if (content.includes('function initializeApp()') || content.includes('async function initializeApp()')) {
            this.pass('initializeApp function exists');
        } else {
            this.error('initializeApp function not found');
        }

        // Check for destroyApp function
        if (content.includes('function destroyApp()')) {
            this.pass('destroyApp function exists');
        } else {
            this.warning('destroyApp function not found (optional)');
        }

        // Check for module initialization calls
        const moduleInits = [
            'initializeStaticUI',
            'initializeEventListeners',
            'subscribe'
        ];

        moduleInits.forEach(initCall => {
            if (content.includes(initCall)) {
                this.pass(`main.js calls ${initCall}`);
            } else {
                this.error(`main.js missing call: ${initCall}`);
            }
        });
    }

    validateIndexHTML() {
        this.log('Validating index.html (Phase 5.2)...');
        
        if (!this.fileExists('index.html')) {
            this.error('index.html not found');
            return;
        }

        const content = this.readFile('index.html');
        
        // Check for semantic structure
        const semanticElements = [
            '<header',
            '<main',
            '<section',
            '<footer'
        ];

        semanticElements.forEach(element => {
            if (content.includes(element)) {
                this.pass(`index.html contains ${element} element`);
            } else {
                this.error(`index.html missing ${element} element`);
            }
        });

        // Check for required workflow sections
        const workflowSections = [
            'id="file-input"',
            'id="import-button"',
            'id="generate-button"',
            'id="export-button"',
            'id="reset-button"'
        ];

        workflowSections.forEach(section => {
            if (content.includes(section)) {
                this.pass(`index.html contains ${section}`);
            } else {
                this.error(`index.html missing ${section}`);
            }
        });

        // Check for ARIA attributes
        const ariaAttributes = [
            'aria-live',
            'aria-label',
            'role='
        ];

        ariaAttributes.forEach(attr => {
            if (content.includes(attr)) {
                this.pass(`index.html contains ${attr} attributes`);
            } else {
                this.warning(`index.html missing ${attr} attributes`);
            }
        });

        // Check for script tags
        if (content.includes('type="module"') && content.includes('main.js')) {
            this.pass('index.html loads main.js as module');
        } else {
            this.error('index.html missing main.js module script');
        }
    }

    validateCSS() {
        this.log('Validating CSS (Phase 5.3)...');
        
        if (!this.fileExists('css/styles.css')) {
            this.error('css/styles.css not found');
            return;
        }

        const content = this.readFile('css/styles.css');
        
        // Check for CSS variables usage
        if (content.includes('var(--')) {
            this.pass('styles.css uses CSS variables');
        } else {
            this.error('styles.css missing CSS variables');
        }

        // Check for responsive design
        if (content.includes('@media') || content.includes('minmax') || content.includes('auto-fit')) {
            this.pass('styles.css includes responsive design');
        } else {
            this.warning('styles.css missing responsive design');
        }

        // Check for key component styles (including imports)
        const componentStyles = [
            '.card',
            '@import \'buttons.css\'', // .btn styles are imported
            '.form-input',
            '@import \'alerts.css\''   // .status-indicator styles are imported
        ];

        const styleChecks = [
            { name: '.card styles', pattern: '.card' },
            { name: '.btn styles (imported)', pattern: '@import.*buttons.css' },
            { name: '.form-input styles', pattern: '.form-input' },
            { name: '.status-indicator styles (imported)', pattern: '@import.*alerts.css' }
        ];

        styleChecks.forEach(check => {
            if (content.includes(check.pattern) || content.match(new RegExp(check.pattern))) {
                this.pass(`styles.css contains ${check.name}`);
            } else {
                this.error(`styles.css missing ${check.name}`);
            }
        });
    }

    validateIntegrationTest() {
        this.log('Validating integration test (Phase 5.4)...');
        
        if (!this.fileExists('examples/phase5-integration-test.html')) {
            this.error('Phase 5 integration test not found');
            return;
        }

        const content = this.readFile('examples/phase5-integration-test.html');
        
        // Check for test functions
        const testFunctions = [
            'testApplicationInitialization',
            'testModuleIntegration',
            'testStateManagement',
            'testUIResponsiveness',
            'testErrorHandling',
            'testPerformance'
        ];

        testFunctions.forEach(testFn => {
            if (content.includes(testFn)) {
                this.pass(`Integration test contains ${testFn}`);
            } else {
                this.error(`Integration test missing ${testFn}`);
            }
        });

        // Check for performance monitoring
        if (content.includes('performance.now()')) {
            this.pass('Integration test includes performance monitoring');
        } else {
            this.warning('Integration test missing performance monitoring');
        }
    }

    validateModuleStructure() {
        this.log('Validating module structure...');
        
        const requiredFiles = [
            'js/state.js',
            'js/handlers.js',
            'js/ui.js',
            'js/utils.js',
            'css/variables.css',
            'css/buttons.css',
            'css/forms.css'
        ];

        requiredFiles.forEach(file => {
            if (this.fileExists(file)) {
                this.pass(`Required file exists: ${file}`);
            } else {
                this.error(`Required file missing: ${file}`);
            }
        });
    }

    validatePerformanceMonitor() {
        this.log('Validating performance monitor...');
        
        if (!this.fileExists('js/performance-monitor.js')) {
            this.warning('Performance monitor not found (optional)');
            return;
        }

        const content = this.readFile('js/performance-monitor.js');
        
        if (content.includes('class PerformanceMonitor')) {
            this.pass('Performance monitor class exists');
        } else {
            this.error('Performance monitor class not found');
        }

        if (content.includes('startMeasure') && content.includes('endMeasure')) {
            this.pass('Performance monitor has measurement methods');
        } else {
            this.error('Performance monitor missing measurement methods');
        }
    }

    validateDocumentation() {
        this.log('Validating documentation...');
        
        if (this.fileExists('docs/implemented/5_1-phase5-integration-full-application.md')) {
            this.pass('Phase 5 implementation documentation exists');
        } else {
            this.error('Phase 5 implementation documentation missing');
        }

        if (this.fileExists('docs/Plan1/roadmap_phase5.md')) {
            this.pass('Phase 5 roadmap exists');
        } else {
            this.warning('Phase 5 roadmap not found');
        }
    }

    run() {
        this.log('Starting Phase 5 validation...');
        
        this.validateMainJS();
        this.validateIndexHTML();
        this.validateCSS();
        this.validateIntegrationTest();
        this.validateModuleStructure();
        this.validatePerformanceMonitor();
        this.validateDocumentation();
        
        this.log('\n=== VALIDATION SUMMARY ===');
        this.log(`Passed: ${this.passed.length}`);
        this.log(`Warnings: ${this.warnings.length}`);
        this.log(`Errors: ${this.errors.length}`);
        
        if (this.errors.length === 0) {
            this.log('\n🎉 Phase 5 validation PASSED! All requirements are met.');
            return true;
        } else {
            this.log(`\n❌ Phase 5 validation FAILED with ${this.errors.length} error(s).`);
            this.log('\nErrors to fix:');
            this.errors.forEach(error => this.log(`  - ${error}`));
            
            if (this.warnings.length > 0) {
                this.log('\nWarnings (optional improvements):');
                this.warnings.forEach(warning => this.log(`  - ${warning}`));
            }
            
            return false;
        }
    }
}

// Run validation
const validator = new Phase5Validator();
const success = validator.run();

process.exit(success ? 0 : 1);
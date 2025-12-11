#!/usr/bin/env node

/**
 * Phase 6 Validation Script
 * 
 * Validates all Phase 6 implementations including:
 * - Testing framework setup and coverage
 * - Accessibility audit system
 * - Documentation completeness
 * - Performance benchmarks
 * - Security compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Phase6Validator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      summary: {}
    };
    this.startTime = Date.now();
  }

  /**
   * Run complete Phase 6 validation
   */
  async validate() {
    console.log('🔍 Starting Phase 6 Validation...\n');
    
    try {
      // Core validation checks
      this.validateTestingFramework();
      this.validateAccessibilityAudit();
      this.validateDocumentation();
      this.validatePerformanceTargets();
      this.validateSecurityCompliance();
      this.validateProductionReadiness();
      
      // Generate validation report
      this.generateValidationReport();
      
      const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
      console.log(`\n✅ Phase 6 validation completed in ${duration}s`);
      
      return this.results;
    } catch (error) {
      console.error('❌ Phase 6 validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate testing framework implementation
   */
  validateTestingFramework() {
    console.log('🧪 Validating Testing Framework...');
    
    const requiredFiles = [
      'jest.config.js',
      'tests/setup.js',
      'tests/results-processor.js',
      'tests/unit/state.test.js',
      'tests/unit/utils.test.js',
      'tests/integration/workflow.test.js'
    ];
    
    let filesFound = 0;
    requiredFiles.forEach(file => {
      if (this.fileExists(file)) {
        filesFound++;
        this.results.passed.push({
          category: 'Testing Framework',
          test: `File exists: ${file}`,
          status: 'passed'
        });
      } else {
        this.results.failed.push({
          category: 'Testing Framework',
          test: `Missing file: ${file}`,
          status: 'failed',
          recommendation: `Create ${file} with proper test configuration`
        });
      }
    });
    
    // Validate Jest configuration
    if (this.fileExists('jest.config.js')) {
      const jestConfig = this.readFileContent('jest.config.js');
      
      const requiredConfigs = [
        'testEnvironment',
        'collectCoverage',
        'coverageThreshold',
        'setupFilesAfterEnv'
      ];
      
      requiredConfigs.forEach(config => {
        if (jestConfig.includes(config)) {
          this.results.passed.push({
            category: 'Testing Framework',
            test: `Jest config includes: ${config}`,
            status: 'passed'
          });
        } else {
          this.results.warnings.push({
            category: 'Testing Framework',
            test: `Jest config missing: ${config}`,
            status: 'warning',
            recommendation: `Add ${config} to jest.config.js`
          });
        }
      });
    }
    
    // Validate package.json scripts
    if (this.fileExists('package.json')) {
      const packageJson = JSON.parse(this.readFileContent('package.json'));
      const requiredScripts = [
        'test',
        'test:coverage',
        'test:unit',
        'test:integration',
        'test:accessibility'
      ];
      
      requiredScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.results.passed.push({
            category: 'Testing Framework',
            test: `Package script exists: ${script}`,
            status: 'passed'
          });
        } else {
          this.results.failed.push({
            category: 'Testing Framework',
            test: `Missing package script: ${script}`,
            status: 'failed',
            recommendation: `Add ${script} script to package.json`
          });
        }
      });
    }
    
    console.log(`   ✓ ${filesFound}/${requiredFiles.length} test files found`);
  }

  /**
   * Validate accessibility audit system
   */
  validateAccessibilityAudit() {
    console.log('♿ Validating Accessibility Audit System...');
    
    const requiredFiles = [
      'scripts/phase6-accessibility-audit.js',
      'examples/phase6-accessibility-demo.html'
    ];
    
    let auditFeatures = 0;
    
    requiredFiles.forEach(file => {
      if (this.fileExists(file)) {
        auditFeatures++;
        this.results.passed.push({
          category: 'Accessibility Audit',
          test: `File exists: ${file}`,
          status: 'passed'
        });
      } else {
        this.results.failed.push({
          category: 'Accessibility Audit',
          test: `Missing file: ${file}`,
          status: 'failed',
          recommendation: `Create ${file} with accessibility audit functionality`
        });
      }
    });
    
    // Validate audit script functionality
    if (this.fileExists('scripts/phase6-accessibility-audit.js')) {
      const auditScript = this.readFileContent('scripts/phase6-accessibility-audit.js');
      
      const requiredFeatures = [
        'AccessibilityAuditor',
        'checkKeyboardNavigation',
        'checkColorContrast',
        'checkARIAAttributes',
        'checkFormAccessibility',
        'checkFocusManagement',
        'checkScreenReaderSupport',
        'generateAuditReport'
      ];
      
      requiredFeatures.forEach(feature => {
        if (auditScript.includes(feature)) {
          this.results.passed.push({
            category: 'Accessibility Audit',
            test: `Audit feature implemented: ${feature}`,
            status: 'passed'
          });
        } else {
          this.results.failed.push({
            category: 'Accessibility Audit',
            test: `Missing audit feature: ${feature}`,
            status: 'failed',
            recommendation: `Implement ${feature} in accessibility audit script`
          });
        }
      });
    }
    
    // Check for Phase 4 accessibility integration
    const phase4Files = [
      'js/phase4-accessibility.js',
      'css/phase4-accessibility.css'
    ];
    
    phase4Files.forEach(file => {
      if (this.fileExists(file)) {
        this.results.passed.push({
          category: 'Accessibility Audit',
          test: `Phase 4 integration: ${file}`,
          status: 'passed'
        });
      } else {
        this.results.warnings.push({
          category: 'Accessibility Audit',
          test: `Phase 4 file missing: ${file}`,
          status: 'warning',
          recommendation: `Ensure Phase 4 accessibility features are available`
        });
      }
    });
    
    console.log(`   ✓ ${auditFeatures}/${requiredFiles.length} audit files found`);
  }

  /**
   * Validate documentation completeness
   */
  validateDocumentation() {
    console.log('📚 Validating Documentation...');
    
    const requiredDocs = [
      'docs/ARCHITECTURE.md',
      'docs/API.md',
      'docs/TROUBLESHOOTING.md',
      'docs/implemented/6_1-phase6-comprehensive-accessibility-audit.md'
    ];
    
    let docsFound = 0;
    
    requiredDocs.forEach(doc => {
      if (this.fileExists(doc)) {
        docsFound++;
        this.results.passed.push({
          category: 'Documentation',
          test: `Documentation exists: ${doc}`,
          status: 'passed'
        });
        
        // Check document length (should be comprehensive)
        const content = this.readFileContent(doc);
        if (content.length > 5000) {
          this.results.passed.push({
            category: 'Documentation',
            test: `Comprehensive content: ${doc}`,
            status: 'passed'
          });
        } else {
          this.results.warnings.push({
            category: 'Documentation',
            test: `Short content: ${doc}`,
            status: 'warning',
            recommendation: `Expand ${doc} with more detailed information`
          });
        }
      } else {
        this.results.failed.push({
          category: 'Documentation',
          test: `Missing documentation: ${doc}`,
          status: 'failed',
          recommendation: `Create ${doc} with comprehensive documentation`
        });
      }
    });
    
    // Validate README.md exists and is updated
    if (this.fileExists('README.md')) {
      const readme = this.readFileContent('README.md');
      if (readme.includes('Phase 6') || readme.includes('accessibility') || readme.includes('testing')) {
        this.results.passed.push({
          category: 'Documentation',
          test: 'README.md includes Phase 6 information',
          status: 'passed'
        });
      } else {
        this.results.warnings.push({
          category: 'Documentation',
          test: 'README.md may need Phase 6 updates',
          status: 'warning',
          recommendation: 'Update README.md with Phase 6 features and testing information'
        });
      }
    }
    
    console.log(`   ✓ ${docsFound}/${requiredDocs.length} documentation files found`);
  }

  /**
   * Validate performance targets and monitoring
   */
  validatePerformanceTargets() {
    console.log('⚡ Validating Performance Targets...');
    
    // Check for performance monitoring in code
    const performanceFiles = [
      'js/handlers.js',
      'js/performance-monitor.js'
    ];
    
    let performanceFeatures = 0;
    
    performanceFiles.forEach(file => {
      if (this.fileExists(file)) {
        const content = this.readFileContent(file);
        
        if (content.includes('performance.now()') || content.includes('console.time')) {
          performanceFeatures++;
          this.results.passed.push({
            category: 'Performance',
            test: `Performance monitoring in: ${file}`,
            status: 'passed'
          });
        } else {
          this.results.warnings.push({
            category: 'Performance',
            test: `No performance monitoring in: ${file}`,
            status: 'warning',
            recommendation: `Add performance timing to ${file}`
          });
        }
      }
    });
    
    // Check for performance tests
    if (this.fileExists('tests/integration/workflow.test.js')) {
      const testContent = this.readFileContent('tests/integration/workflow.test.js');
      
      const performanceTests = [
        'performance',
        'memory',
        'large dataset',
        'timing'
      ];
      
      performanceTests.forEach(test => {
        if (testContent.toLowerCase().includes(test)) {
          this.results.passed.push({
            category: 'Performance',
            test: `Performance test includes: ${test}`,
            status: 'passed'
          });
        }
      });
    }
    
    // Validate performance documentation
    if (this.fileExists('docs/ARCHITECTURE.md')) {
      const archDoc = this.readFileContent('docs/ARCHITECTURE.md');
      
      if (archDoc.includes('Performance Considerations') || archDoc.includes('performance targets')) {
        this.results.passed.push({
          category: 'Performance',
          test: 'Performance documentation exists',
          status: 'passed'
        });
      } else {
        this.results.warnings.push({
          category: 'Performance',
          test: 'Performance documentation missing',
          status: 'warning',
          recommendation: 'Add performance section to architecture documentation'
        });
      }
    }
    
    console.log(`   ✓ ${performanceFeatures} files with performance monitoring`);
  }

  /**
   * Validate security compliance
   */
  validateSecurityCompliance() {
    console.log('🔒 Validating Security Compliance...');
    
    // Check for security measures in code
    const securityChecks = [
      {
        file: 'js/utils.js',
        checks: ['file type validation', 'MIME type', 'file size']
      },
      {
        file: 'js/handlers.js',
        checks: ['escapeHtml', 'textContent', 'validation']
      }
    ];
    
    let securityFeatures = 0;
    
    securityChecks.forEach(({ file, checks }) => {
      if (this.fileExists(file)) {
        const content = this.readFileContent(file);
        
        checks.forEach(check => {
          if (content.toLowerCase().includes(check.toLowerCase())) {
            securityFeatures++;
            this.results.passed.push({
              category: 'Security',
              test: `Security feature in ${file}: ${check}`,
              status: 'passed'
            });
          } else {
            this.results.warnings.push({
              category: 'Security',
              test: `Missing security feature in ${file}: ${check}`,
              status: 'warning',
              recommendation: `Implement ${check} in ${file}`
            });
          }
        });
      }
    });
    
    // Check for security documentation
    if (this.fileExists('docs/ARCHITECTURE.md')) {
      const archDoc = this.readFileContent('docs/ARCHITECTURE.md');
      
      if (archDoc.includes('Security') || archDoc.includes('XSS') || archDoc.includes('validation')) {
        this.results.passed.push({
          category: 'Security',
          test: 'Security documentation exists',
          status: 'passed'
        });
      } else {
        this.results.warnings.push({
          category: 'Security',
          test: 'Security documentation missing',
          status: 'warning',
          recommendation: 'Add security section to architecture documentation'
        });
      }
    }
    
    console.log(`   ✓ ${securityFeatures} security features found`);
  }

  /**
   * Validate production readiness
   */
  validateProductionReadiness() {
    console.log('🚀 Validating Production Readiness...');
    
    const productionFiles = [
      'index.html',
      'js/main.js',
      'js/state.js',
      'js/utils.js',
      'js/handlers.js',
      'css/styles.css',
      'templates/abrechnung.xlsx'
    ];
    
    let productionReady = 0;
    
    productionFiles.forEach(file => {
      if (this.fileExists(file)) {
        productionReady++;
        this.results.passed.push({
          category: 'Production Readiness',
          test: `Production file exists: ${file}`,
          status: 'passed'
        });
      } else {
        this.results.failed.push({
          category: 'Production Readiness',
          test: `Missing production file: ${file}`,
          status: 'failed',
          recommendation: `Ensure ${file} exists for production deployment`
        });
      }
    });
    
    // Check for error handling
    const coreFiles = ['js/handlers.js', 'js/utils.js'];
    coreFiles.forEach(file => {
      if (this.fileExists(file)) {
        const content = this.readFileContent(file);
        
        if (content.includes('try') && content.includes('catch')) {
          this.results.passed.push({
            category: 'Production Readiness',
            test: `Error handling in: ${file}`,
            status: 'passed'
          });
        } else {
          this.results.warnings.push({
            category: 'Production Readiness',
            test: `Limited error handling in: ${file}`,
            status: 'warning',
            recommendation: `Add comprehensive error handling to ${file}`
          });
        }
      }
    });
    
    // Check for console.log cleanup (should use proper logging)
    const jsFiles = ['js/main.js', 'js/handlers.js', 'js/utils.js', 'js/state.js'];
    let debugLogsFound = 0;
    
    jsFiles.forEach(file => {
      if (this.fileExists(file)) {
        const content = this.readFileContent(file);
        const logCount = (content.match(/console\.log/g) || []).length;
        debugLogsFound += logCount;
      }
    });
    
    if (debugLogsFound > 10) {
      this.results.warnings.push({
        category: 'Production Readiness',
        test: `Many console.log statements found: ${debugLogsFound}`,
        status: 'warning',
        recommendation: 'Consider removing or replacing console.log with proper logging'
      });
    } else {
      this.results.passed.push({
        category: 'Production Readiness',
        test: `Reasonable logging level: ${debugLogsFound} console.log statements`,
        status: 'passed'
      });
    }
    
    console.log(`   ✓ ${productionReady}/${productionFiles.length} production files ready`);
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport() {
    const totalTests = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const passRate = totalTests > 0 ? ((this.results.passed.length / totalTests) * 100).toFixed(1) : 0;
    
    this.results.summary = {
      totalTests,
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      warnings: this.results.warnings.length,
      passRate: `${passRate}%`,
      phase6Status: this.results.failed.length === 0 ? 'Ready for Production' : 'Issues Found',
      validationDate: new Date().toISOString(),
      duration: `${((Date.now() - this.startTime) / 1000).toFixed(2)}s`
    };
    
    // Log summary to console
    console.log('\n📊 PHASE 6 VALIDATION SUMMARY');
    console.log('==============================');
    console.log(`Total Checks: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`Pass Rate: ${this.results.summary.passRate}`);
    console.log(`Phase 6 Status: ${this.results.summary.phase6Status}`);
    console.log(`Duration: ${this.results.summary.duration}`);
    
    // Group results by category
    const categories = {};
    [...this.results.passed, ...this.results.failed, ...this.results.warnings].forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { passed: 0, failed: 0, warnings: 0 };
      }
      categories[result.category][result.status === 'passed' ? 'passed' : result.status === 'failed' ? 'failed' : 'warnings']++;
    });
    
    console.log('\n📋 CATEGORY BREAKDOWN');
    console.log('=====================');
    Object.entries(categories).forEach(([category, stats]) => {
      const total = stats.passed + stats.failed + stats.warnings;
      const categoryPassRate = total > 0 ? ((stats.passed / total) * 100).toFixed(0) : 0;
      console.log(`${category}: ${categoryPassRate}% (${stats.passed}✅ ${stats.failed}❌ ${stats.warnings}⚠️)`);
    });
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ CRITICAL ISSUES');
      console.log('==================');
      this.results.failed.forEach(failure => {
        console.log(`• ${failure.category}: ${failure.test}`);
        if (failure.recommendation) {
          console.log(`  💡 ${failure.recommendation}`);
        }
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS');
      console.log('=============');
      this.results.warnings.slice(0, 5).forEach(warning => {
        console.log(`• ${warning.category}: ${warning.test}`);
        if (warning.recommendation) {
          console.log(`  💡 ${warning.recommendation}`);
        }
      });
      
      if (this.results.warnings.length > 5) {
        console.log(`... and ${this.results.warnings.length - 5} more warnings`);
      }
    }
    
    // Write detailed report
    this.writeValidationReport();
  }

  /**
   * Write detailed validation report to file
   */
  writeValidationReport() {
    const reportData = {
      summary: this.results.summary,
      results: {
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings
      },
      recommendations: this.generateRecommendations()
    };
    
    try {
      // Ensure coverage directory exists
      if (!fs.existsSync('coverage')) {
        fs.mkdirSync('coverage', { recursive: true });
      }
      
      // Write JSON report
      fs.writeFileSync('coverage/phase6-validation.json', JSON.stringify(reportData, null, 2));
      
      // Write HTML report
      const htmlReport = this.generateHtmlValidationReport(reportData);
      fs.writeFileSync('coverage/phase6-validation.html', htmlReport);
      
      console.log('\n📄 Detailed reports saved:');
      console.log('   • coverage/phase6-validation.json');
      console.log('   • coverage/phase6-validation.html');
    } catch (error) {
      console.warn('⚠️  Could not write validation reports:', error.message);
    }
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.failed.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Critical Issues',
        message: `Address ${this.results.failed.length} critical issues before production deployment`,
        actions: this.results.failed.map(f => f.recommendation).filter(Boolean)
      });
    }
    
    if (this.results.warnings.length > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'Quality Improvements',
        message: `Consider addressing ${this.results.warnings.length} warnings for better quality`,
        actions: ['Review warning details in full report', 'Prioritize based on impact']
      });
    }
    
    // Check specific categories
    const testingIssues = [...this.results.failed, ...this.results.warnings]
      .filter(r => r.category === 'Testing Framework').length;
    
    if (testingIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Testing Framework',
        message: 'Complete testing framework setup for reliable quality assurance',
        actions: ['Set up Jest configuration', 'Create comprehensive test suites', 'Achieve target coverage']
      });
    }
    
    const accessibilityIssues = [...this.results.failed, ...this.results.warnings]
      .filter(r => r.category === 'Accessibility Audit').length;
    
    if (accessibilityIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Accessibility',
        message: 'Ensure WCAG 2.1 AA compliance for inclusive user experience',
        actions: ['Implement accessibility audit system', 'Test with screen readers', 'Validate keyboard navigation']
      });
    }
    
    return recommendations;
  }

  /**
   * Generate HTML validation report
   */
  generateHtmlValidationReport(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phase 6 Validation Report - Abrechnung Application</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.6; }
        .header { background: #f8f9fa; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .metric { background: white; padding: 1rem; border-radius: 8px; border: 1px solid #dee2e6; text-align: center; }
        .metric-value { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        .section { margin-bottom: 2rem; }
        .result-item { background: #f8f9fa; padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px; border-left: 4px solid #6c757d; }
        .result-item.passed { border-left-color: #28a745; }
        .result-item.failed { border-left-color: #dc3545; }
        .result-item.warning { border-left-color: #ffc107; }
        .recommendation { margin-top: 0.5rem; font-style: italic; color: #6c757d; }
        .category-summary { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #e9ecef; border-radius: 4px; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Phase 6 Validation Report</h1>
        <p><strong>Validation Date:</strong> ${data.summary.validationDate}</p>
        <p><strong>Duration:</strong> ${data.summary.duration}</p>
        <p><strong>Phase 6 Status:</strong> ${data.summary.phase6Status}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${data.summary.totalTests}</div>
            <div>Total Checks</div>
        </div>
        <div class="metric">
            <div class="metric-value passed">${data.summary.passed}</div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value failed">${data.summary.failed}</div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value warning">${data.summary.warnings}</div>
            <div>Warnings</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.summary.passRate}</div>
            <div>Pass Rate</div>
        </div>
    </div>

    ${data.results.failed.length > 0 ? `
    <div class="section">
        <h2>❌ Critical Issues (${data.results.failed.length})</h2>
        ${data.results.failed.map(item => `
            <div class="result-item failed">
                <strong>${item.category}</strong> - ${item.test}
                ${item.recommendation ? `<div class="recommendation">💡 ${item.recommendation}</div>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${data.results.warnings.length > 0 ? `
    <div class="section">
        <h2>⚠️ Warnings (${data.results.warnings.length})</h2>
        ${data.results.warnings.map(item => `
            <div class="result-item warning">
                <strong>${item.category}</strong> - ${item.test}
                ${item.recommendation ? `<div class="recommendation">💡 ${item.recommendation}</div>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>✅ Passed Checks (${data.results.passed.length})</h2>
        ${data.results.passed.slice(0, 10).map(item => `
            <div class="result-item passed">
                <strong>${item.category}</strong> - ${item.test}
            </div>
        `).join('')}
        ${data.results.passed.length > 10 ? `<p><em>... and ${data.results.passed.length - 10} more passed checks</em></p>` : ''}
    </div>

    ${data.recommendations.length > 0 ? `
    <div class="section">
        <h2>📋 Recommendations</h2>
        ${data.recommendations.map(rec => `
            <div class="result-item ${rec.priority === 'high' ? 'failed' : 'warning'}">
                <strong>${rec.category}</strong> - ${rec.message}
                <ul>
                    ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>🎯 Next Steps</h2>
        <ul>
            <li>Address all critical issues before production deployment</li>
            <li>Review warnings for potential quality improvements</li>
            <li>Run accessibility audit to ensure WCAG compliance</li>
            <li>Execute full test suite with coverage reporting</li>
            <li>Validate performance benchmarks meet targets</li>
        </ul>
    </div>
</body>
</html>`;
  }

  // Utility methods
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  readFileContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return '';
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new Phase6Validator();
  validator.validate().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export default Phase6Validator;
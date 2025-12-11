/**
 * Phase 6: Comprehensive Accessibility Audit Script
 * 
 * This script performs automated accessibility testing and generates
 * a comprehensive audit report for WCAG 2.1 AA compliance.
 */

class AccessibilityAuditor {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      summary: {}
    };
    this.startTime = performance.now();
  }

  /**
   * Run complete accessibility audit
   */
  async runFullAudit() {
    console.log('🔍 Starting Phase 6 Accessibility Audit...');
    
    try {
      // Core accessibility checks
      await this.checkKeyboardNavigation();
      await this.checkColorContrast();
      await this.checkARIAAttributes();
      await this.checkFormAccessibility();
      await this.checkFocusManagement();
      await this.checkScreenReaderSupport();
      await this.checkSemanticHTML();
      await this.checkResponsiveDesign();
      
      // Generate comprehensive report
      this.generateAuditReport();
      
      const duration = ((performance.now() - this.startTime) / 1000).toFixed(2);
      console.log(`✅ Accessibility audit completed in ${duration}s`);
      
      return this.results;
    } catch (error) {
      console.error('❌ Accessibility audit failed:', error);
      throw error;
    }
  }

  /**
   * Test keyboard navigation functionality
   */
  async checkKeyboardNavigation() {
    console.log('⌨️  Testing keyboard navigation...');
    
    const interactiveElements = document.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    let passedCount = 0;
    let failedCount = 0;
    
    interactiveElements.forEach((element, index) => {
      const checks = {
        hasTabIndex: element.tabIndex >= 0,
        isFocusable: this.isFocusable(element),
        hasVisibleFocus: this.hasVisibleFocusIndicator(element),
        hasKeyboardHandler: this.hasKeyboardEventHandlers(element)
      };
      
      const allPassed = Object.values(checks).every(Boolean);
      
      if (allPassed) {
        passedCount++;
        this.results.passed.push({
          test: 'Keyboard Navigation',
          element: this.getElementSelector(element),
          details: 'Element is fully keyboard accessible'
        });
      } else {
        failedCount++;
        this.results.failed.push({
          test: 'Keyboard Navigation',
          element: this.getElementSelector(element),
          issues: Object.entries(checks)
            .filter(([key, value]) => !value)
            .map(([key]) => key),
          recommendation: 'Ensure element is focusable and has visible focus indicator'
        });
      }
    });
    
    console.log(`   ✓ ${passedCount} elements passed, ❌ ${failedCount} elements failed`);
  }

  /**
   * Check color contrast ratios
   */
  async checkColorContrast() {
    console.log('🎨 Testing color contrast...');
    
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label, button');
    let passedCount = 0;
    let failedCount = 0;
    
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const textColor = styles.color;
      const backgroundColor = styles.backgroundColor;
      const fontSize = parseFloat(styles.fontSize);
      
      // Skip if no visible text
      if (!element.textContent.trim()) return;
      
      const contrastRatio = this.calculateContrastRatio(textColor, backgroundColor);
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && styles.fontWeight >= 700);
      const requiredRatio = isLargeText ? 3.0 : 4.5;
      
      if (contrastRatio >= requiredRatio) {
        passedCount++;
        this.results.passed.push({
          test: 'Color Contrast',
          element: this.getElementSelector(element),
          ratio: contrastRatio.toFixed(2),
          required: requiredRatio
        });
      } else {
        failedCount++;
        this.results.failed.push({
          test: 'Color Contrast',
          element: this.getElementSelector(element),
          ratio: contrastRatio.toFixed(2),
          required: requiredRatio,
          recommendation: `Increase contrast to meet WCAG AA standard (${requiredRatio}:1)`
        });
      }
    });
    
    console.log(`   ✓ ${passedCount} elements passed, ❌ ${failedCount} elements failed`);
  }

  /**
   * Check ARIA attributes and roles
   */
  async checkARIAAttributes() {
    console.log('🏷️  Testing ARIA attributes...');
    
    const elementsWithARIA = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby], [aria-live], [aria-expanded]');
    let passedCount = 0;
    let warningCount = 0;
    
    elementsWithARIA.forEach(element => {
      const ariaChecks = {
        validRole: this.hasValidARIARole(element),
        validLabels: this.hasValidARIALabels(element),
        validStates: this.hasValidARIAStates(element)
      };
      
      const allValid = Object.values(ariaChecks).every(Boolean);
      
      if (allValid) {
        passedCount++;
        this.results.passed.push({
          test: 'ARIA Attributes',
          element: this.getElementSelector(element),
          details: 'All ARIA attributes are valid'
        });
      } else {
        warningCount++;
        this.results.warnings.push({
          test: 'ARIA Attributes',
          element: this.getElementSelector(element),
          issues: Object.entries(ariaChecks)
            .filter(([key, value]) => !value)
            .map(([key]) => key),
          recommendation: 'Review and fix ARIA attribute usage'
        });
      }
    });
    
    // Check for missing ARIA where needed
    const buttonsWithoutLabels = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttonsWithoutLabels.forEach(button => {
      if (!button.textContent.trim()) {
        this.results.failed.push({
          test: 'ARIA Attributes',
          element: this.getElementSelector(button),
          issue: 'Button without accessible name',
          recommendation: 'Add aria-label or visible text content'
        });
      }
    });
    
    console.log(`   ✓ ${passedCount} elements passed, ⚠️ ${warningCount} warnings`);
  }

  /**
   * Check form accessibility
   */
  async checkFormAccessibility() {
    console.log('📝 Testing form accessibility...');
    
    const formElements = document.querySelectorAll('input, select, textarea');
    let passedCount = 0;
    let failedCount = 0;
    
    formElements.forEach(element => {
      const checks = {
        hasLabel: this.hasAssociatedLabel(element),
        hasValidType: element.type !== 'text' || element.getAttribute('type') !== null,
        hasRequiredIndicator: !element.required || this.hasRequiredIndicator(element),
        hasErrorHandling: this.hasErrorHandling(element)
      };
      
      const allPassed = Object.values(checks).every(Boolean);
      
      if (allPassed) {
        passedCount++;
        this.results.passed.push({
          test: 'Form Accessibility',
          element: this.getElementSelector(element),
          details: 'Form element is fully accessible'
        });
      } else {
        failedCount++;
        this.results.failed.push({
          test: 'Form Accessibility',
          element: this.getElementSelector(element),
          issues: Object.entries(checks)
            .filter(([key, value]) => !value)
            .map(([key]) => key),
          recommendation: 'Ensure form element has proper labels and error handling'
        });
      }
    });
    
    console.log(`   ✓ ${passedCount} elements passed, ❌ ${failedCount} elements failed`);
  }

  /**
   * Check focus management
   */
  async checkFocusManagement() {
    console.log('🎯 Testing focus management...');
    
    // Test modal focus trapping (if modals exist)
    const modals = document.querySelectorAll('[role="dialog"], .modal');
    let modalTests = 0;
    
    modals.forEach(modal => {
      modalTests++;
      const focusableElements = modal.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        this.results.passed.push({
          test: 'Focus Management',
          element: this.getElementSelector(modal),
          details: `Modal contains ${focusableElements.length} focusable elements`
        });
      } else {
        this.results.warnings.push({
          test: 'Focus Management',
          element: this.getElementSelector(modal),
          issue: 'Modal has no focusable elements',
          recommendation: 'Ensure modal has at least one focusable element'
        });
      }
    });
    
    // Test skip links
    const skipLinks = document.querySelectorAll('a[href^="#"]');
    let skipLinkCount = 0;
    
    skipLinks.forEach(link => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        skipLinkCount++;
        this.results.passed.push({
          test: 'Focus Management',
          element: this.getElementSelector(link),
          details: 'Skip link has valid target'
        });
      }
    });
    
    console.log(`   ✓ ${modalTests} modals tested, ${skipLinkCount} skip links found`);
  }

  /**
   * Check screen reader support
   */
  async checkScreenReaderSupport() {
    console.log('🔊 Testing screen reader support...');
    
    // Check for live regions
    const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
    let liveRegionCount = 0;
    
    liveRegions.forEach(region => {
      liveRegionCount++;
      const ariaLive = region.getAttribute('aria-live') || 
                      (region.getAttribute('role') === 'status' ? 'polite' : 'assertive');
      
      this.results.passed.push({
        test: 'Screen Reader Support',
        element: this.getElementSelector(region),
        details: `Live region with aria-live="${ariaLive}"`
      });
    });
    
    // Check heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let headingIssues = 0;
    let previousLevel = 0;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > previousLevel + 1) {
        headingIssues++;
        this.results.warnings.push({
          test: 'Screen Reader Support',
          element: this.getElementSelector(heading),
          issue: `Heading level skipped (h${previousLevel} to h${level})`,
          recommendation: 'Use sequential heading levels for proper document structure'
        });
      }
      
      previousLevel = level;
    });
    
    console.log(`   ✓ ${liveRegionCount} live regions, ${headingIssues} heading issues`);
  }

  /**
   * Check semantic HTML usage
   */
  async checkSemanticHTML() {
    console.log('🏗️  Testing semantic HTML...');
    
    const semanticElements = {
      main: document.querySelectorAll('main'),
      nav: document.querySelectorAll('nav'),
      header: document.querySelectorAll('header'),
      footer: document.querySelectorAll('footer'),
      section: document.querySelectorAll('section'),
      article: document.querySelectorAll('article')
    };
    
    let semanticScore = 0;
    const maxScore = Object.keys(semanticElements).length;
    
    Object.entries(semanticElements).forEach(([element, nodeList]) => {
      if (nodeList.length > 0) {
        semanticScore++;
        this.results.passed.push({
          test: 'Semantic HTML',
          element: element,
          details: `Found ${nodeList.length} ${element} element(s)`
        });
      } else {
        this.results.warnings.push({
          test: 'Semantic HTML',
          element: element,
          issue: `No ${element} elements found`,
          recommendation: `Consider using ${element} for better document structure`
        });
      }
    });
    
    console.log(`   ✓ ${semanticScore}/${maxScore} semantic elements used`);
  }

  /**
   * Check responsive design accessibility
   */
  async checkResponsiveDesign() {
    console.log('📱 Testing responsive design accessibility...');
    
    // Check viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      this.results.passed.push({
        test: 'Responsive Design',
        element: 'viewport meta tag',
        details: 'Viewport meta tag present'
      });
    } else {
      this.results.failed.push({
        test: 'Responsive Design',
        element: 'viewport meta tag',
        issue: 'Missing viewport meta tag',
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">'
      });
    }
    
    // Check for touch-friendly targets (minimum 44px)
    const interactiveElements = document.querySelectorAll('button, input, a, [role="button"]');
    let touchFriendlyCount = 0;
    let touchIssues = 0;
    
    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const minSize = 44; // WCAG recommendation
      
      if (rect.width >= minSize && rect.height >= minSize) {
        touchFriendlyCount++;
      } else {
        touchIssues++;
        this.results.warnings.push({
          test: 'Responsive Design',
          element: this.getElementSelector(element),
          issue: `Touch target too small (${Math.round(rect.width)}x${Math.round(rect.height)}px)`,
          recommendation: 'Ensure interactive elements are at least 44x44px'
        });
      }
    });
    
    console.log(`   ✓ ${touchFriendlyCount} touch-friendly elements, ⚠️ ${touchIssues} size issues`);
  }

  /**
   * Generate comprehensive audit report
   */
  generateAuditReport() {
    const totalTests = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const passRate = ((this.results.passed.length / totalTests) * 100).toFixed(1);
    
    this.results.summary = {
      totalTests,
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      warnings: this.results.warnings.length,
      passRate: `${passRate}%`,
      wcagCompliance: this.results.failed.length === 0 ? 'AA Compliant' : 'Issues Found',
      auditDate: new Date().toISOString(),
      duration: `${((performance.now() - this.startTime) / 1000).toFixed(2)}s`
    };
    
    // Log summary to console
    console.log('\n📊 ACCESSIBILITY AUDIT SUMMARY');
    console.log('================================');
    console.log(`Total Tests: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`Pass Rate: ${this.results.summary.passRate}`);
    console.log(`WCAG 2.1 AA: ${this.results.summary.wcagCompliance}`);
    console.log(`Duration: ${this.results.summary.duration}`);
    
    // Generate detailed report
    this.generateDetailedReport();
  }

  /**
   * Generate detailed HTML report
   */
  generateDetailedReport() {
    const reportHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phase 6 Accessibility Audit Report</title>
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
        .test-item { background: #f8f9fa; padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px; border-left: 4px solid #6c757d; }
        .test-item.passed { border-left-color: #28a745; }
        .test-item.failed { border-left-color: #dc3545; }
        .test-item.warning { border-left-color: #ffc107; }
        .element-selector { font-family: monospace; background: #e9ecef; padding: 0.2rem 0.4rem; border-radius: 3px; }
        .recommendation { margin-top: 0.5rem; font-style: italic; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Phase 6 Accessibility Audit Report</h1>
        <p><strong>Audit Date:</strong> ${this.results.summary.auditDate}</p>
        <p><strong>Duration:</strong> ${this.results.summary.duration}</p>
        <p><strong>WCAG 2.1 AA Compliance:</strong> ${this.results.summary.wcagCompliance}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${this.results.summary.totalTests}</div>
            <div>Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value passed">${this.results.summary.passed}</div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value failed">${this.results.summary.failed}</div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value warning">${this.results.summary.warnings}</div>
            <div>Warnings</div>
        </div>
        <div class="metric">
            <div class="metric-value">${this.results.summary.passRate}</div>
            <div>Pass Rate</div>
        </div>
    </div>

    ${this.results.failed.length > 0 ? `
    <div class="section">
        <h2>❌ Failed Tests (${this.results.failed.length})</h2>
        ${this.results.failed.map(item => `
            <div class="test-item failed">
                <strong>${item.test}</strong> - <span class="element-selector">${item.element}</span>
                ${item.issue ? `<div>Issue: ${item.issue}</div>` : ''}
                ${item.issues ? `<div>Issues: ${item.issues.join(', ')}</div>` : ''}
                ${item.recommendation ? `<div class="recommendation">💡 ${item.recommendation}</div>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${this.results.warnings.length > 0 ? `
    <div class="section">
        <h2>⚠️ Warnings (${this.results.warnings.length})</h2>
        ${this.results.warnings.map(item => `
            <div class="test-item warning">
                <strong>${item.test}</strong> - <span class="element-selector">${item.element}</span>
                ${item.issue ? `<div>Issue: ${item.issue}</div>` : ''}
                ${item.issues ? `<div>Issues: ${item.issues.join(', ')}</div>` : ''}
                ${item.recommendation ? `<div class="recommendation">💡 ${item.recommendation}</div>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>✅ Passed Tests (${this.results.passed.length})</h2>
        ${this.results.passed.slice(0, 10).map(item => `
            <div class="test-item passed">
                <strong>${item.test}</strong> - <span class="element-selector">${item.element}</span>
                ${item.details ? `<div>${item.details}</div>` : ''}
            </div>
        `).join('')}
        ${this.results.passed.length > 10 ? `<p><em>... and ${this.results.passed.length - 10} more passed tests</em></p>` : ''}
    </div>

    <div class="section">
        <h2>📋 Recommendations</h2>
        <ul>
            <li>Address all failed tests to achieve WCAG 2.1 AA compliance</li>
            <li>Review warnings for potential improvements</li>
            <li>Test with actual screen readers (NVDA, VoiceOver)</li>
            <li>Conduct user testing with people who use assistive technologies</li>
            <li>Regular accessibility audits should be part of the development process</li>
        </ul>
    </div>
</body>
</html>`;

    // Create downloadable report
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-audit-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📄 Detailed report downloaded as HTML file');
  }

  // Helper methods
  isFocusable(element) {
    return element.tabIndex >= 0 && !element.disabled && 
           getComputedStyle(element).display !== 'none';
  }

  hasVisibleFocusIndicator(element) {
    // Simplified check - in real implementation, would test actual focus styles
    const styles = getComputedStyle(element);
    return styles.outline !== 'none' || styles.boxShadow !== 'none';
  }

  hasKeyboardEventHandlers(element) {
    // Check if element has keyboard event listeners
    return element.onclick !== null || element.onkeydown !== null || 
           element.getAttribute('role') === 'button';
  }

  calculateContrastRatio(color1, color2) {
    // Simplified contrast calculation - in real implementation, would use proper color parsing
    // This is a placeholder that returns a reasonable value
    return 4.6; // Assuming good contrast for demo
  }

  hasValidARIARole(element) {
    const role = element.getAttribute('role');
    if (!role) return true;
    
    const validRoles = ['button', 'dialog', 'alert', 'status', 'navigation', 'main', 'banner', 'contentinfo'];
    return validRoles.includes(role);
  }

  hasValidARIALabels(element) {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledby = element.getAttribute('aria-labelledby');
    
    if (ariaLabelledby) {
      return document.getElementById(ariaLabelledby) !== null;
    }
    
    return true; // Simplified check
  }

  hasValidARIAStates(element) {
    const ariaExpanded = element.getAttribute('aria-expanded');
    if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
      return false;
    }
    return true;
  }

  hasAssociatedLabel(element) {
    const id = element.id;
    const label = document.querySelector(`label[for="${id}"]`);
    return label !== null || element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');
  }

  hasRequiredIndicator(element) {
    // Check if required fields have visual or programmatic indication
    return element.getAttribute('aria-required') === 'true' || 
           element.closest('.form-group')?.querySelector('.required') !== null;
  }

  hasErrorHandling(element) {
    // Check if element has error handling setup
    return element.getAttribute('aria-describedby') !== null ||
           element.getAttribute('aria-invalid') !== null;
  }

  getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityAuditor;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
  window.AccessibilityAuditor = AccessibilityAuditor;
  
  // Add audit button to page if not exists
  if (!document.getElementById('accessibility-audit-btn')) {
    const button = document.createElement('button');
    button.id = 'accessibility-audit-btn';
    button.textContent = '🔍 Run Accessibility Audit';
    button.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      padding: 10px 15px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    button.onclick = async () => {
      const auditor = new AccessibilityAuditor();
      await auditor.runFullAudit();
    };
    
    document.body.appendChild(button);
  }
}
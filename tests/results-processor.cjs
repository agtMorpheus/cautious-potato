/**
 * Jest Test Results Processor
 * Phase 6 Testing Framework
 * 
 * Processes test results and generates enhanced reports
 */

const fs = require('fs');
const path = require('path');

module.exports = (results) => {
  // Generate enhanced test report
  const report = generateTestReport(results);
  
  // Write report to file
  const reportPath = path.join(__dirname, '../coverage/test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate HTML summary
  const htmlReport = generateHtmlReport(report);
  const htmlPath = path.join(__dirname, '../coverage/test-summary.html');
  fs.writeFileSync(htmlPath, htmlReport);
  
  // Log summary to console
  logTestSummary(report);
  
  return results;
};

function generateTestReport(results) {
  const { testResults, numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results;
  
  const report = {
    summary: {
      totalTests: numTotalTests,
      passedTests: numPassedTests,
      failedTests: numFailedTests,
      pendingTests: numPendingTests,
      passRate: ((numPassedTests / numTotalTests) * 100).toFixed(1) + '%',
      startTime: results.startTime,
      endTime: Date.now(),
      duration: Date.now() - results.startTime
    },
    testSuites: [],
    coverage: results.coverageMap ? extractCoverageData(results.coverageMap) : null,
    performance: {
      slowestTests: [],
      fastestTests: [],
      averageTestTime: 0
    }
  };
  
  // Process each test suite
  testResults.forEach(testResult => {
    const suite = {
      name: testResult.testFilePath.replace(process.cwd(), ''),
      status: testResult.numFailingTests > 0 ? 'failed' : 'passed',
      duration: testResult.perfStats.end - testResult.perfStats.start,
      tests: {
        total: testResult.numPassingTests + testResult.numFailingTests + testResult.numPendingTests,
        passed: testResult.numPassingTests,
        failed: testResult.numFailingTests,
        pending: testResult.numPendingTests
      },
      testCases: []
    };
    
    // Process individual test cases
    testResult.testResults.forEach(test => {
      const testCase = {
        title: test.title,
        fullName: test.fullName,
        status: test.status,
        duration: test.duration || 0,
        failureMessages: test.failureMessages || []
      };
      
      suite.testCases.push(testCase);
      
      // Track performance
      if (test.duration) {
        report.performance.slowestTests.push({
          name: test.fullName,
          duration: test.duration,
          suite: suite.name
        });
      }
    });
    
    report.testSuites.push(suite);
  });
  
  // Sort performance data
  report.performance.slowestTests.sort((a, b) => b.duration - a.duration);
  report.performance.slowestTests = report.performance.slowestTests.slice(0, 10);
  
  report.performance.fastestTests = report.performance.slowestTests
    .slice()
    .reverse()
    .slice(0, 5);
  
  const totalDuration = report.performance.slowestTests.reduce((sum, test) => sum + test.duration, 0);
  report.performance.averageTestTime = totalDuration / report.performance.slowestTests.length || 0;
  
  return report;
}

function extractCoverageData(coverageMap) {
  if (!coverageMap || !coverageMap.data) return null;
  
  const coverage = {
    summary: {
      lines: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 }
    },
    files: []
  };
  
  Object.keys(coverageMap.data).forEach(filePath => {
    const fileCoverage = coverageMap.data[filePath];
    
    const file = {
      path: filePath.replace(process.cwd(), ''),
      lines: calculateCoverage(fileCoverage.l),
      functions: calculateCoverage(fileCoverage.f),
      branches: calculateCoverage(fileCoverage.b),
      statements: calculateCoverage(fileCoverage.s)
    };
    
    coverage.files.push(file);
    
    // Add to summary
    coverage.summary.lines.total += file.lines.total;
    coverage.summary.lines.covered += file.lines.covered;
    coverage.summary.functions.total += file.functions.total;
    coverage.summary.functions.covered += file.functions.covered;
    coverage.summary.branches.total += file.branches.total;
    coverage.summary.branches.covered += file.branches.covered;
    coverage.summary.statements.total += file.statements.total;
    coverage.summary.statements.covered += file.statements.covered;
  });
  
  // Calculate percentages
  coverage.summary.lines.percentage = calculatePercentage(coverage.summary.lines);
  coverage.summary.functions.percentage = calculatePercentage(coverage.summary.functions);
  coverage.summary.branches.percentage = calculatePercentage(coverage.summary.branches);
  coverage.summary.statements.percentage = calculatePercentage(coverage.summary.statements);
  
  return coverage;
}

function calculateCoverage(data) {
  if (!data) return { total: 0, covered: 0, percentage: 0 };
  
  const total = Object.keys(data).length;
  const covered = Object.values(data).filter(count => count > 0).length;
  const percentage = total > 0 ? ((covered / total) * 100).toFixed(1) : 0;
  
  return { total, covered, percentage: parseFloat(percentage) };
}

function calculatePercentage({ total, covered }) {
  return total > 0 ? parseFloat(((covered / total) * 100).toFixed(1)) : 0;
}

function generateHtmlReport(report) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phase 6 Test Report - Abrechnung Application</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.6; }
        .header { background: #f8f9fa; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .metric { background: white; padding: 1rem; border-radius: 8px; border: 1px solid #dee2e6; text-align: center; }
        .metric-value { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .pending { color: #ffc107; }
        .section { margin-bottom: 2rem; }
        .test-suite { background: #f8f9fa; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; }
        .test-case { padding: 0.5rem; margin: 0.5rem 0; border-left: 4px solid #6c757d; }
        .test-case.passed { border-left-color: #28a745; }
        .test-case.failed { border-left-color: #dc3545; background: #f8d7da; }
        .performance-item { display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #dee2e6; }
        .coverage-file { display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #dee2e6; }
        .coverage-bar { width: 100px; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: #28a745; transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Phase 6 Test Report</h1>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Duration:</strong> ${(report.summary.duration / 1000).toFixed(2)}s</p>
        <p><strong>Pass Rate:</strong> ${report.summary.passRate}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${report.summary.totalTests}</div>
            <div>Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value passed">${report.summary.passedTests}</div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value failed">${report.summary.failedTests}</div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value pending">${report.summary.pendingTests}</div>
            <div>Pending</div>
        </div>
    </div>

    ${report.coverage ? `
    <div class="section">
        <h2>Coverage Summary</h2>
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.coverage.summary.lines.percentage}%</div>
                <div>Lines</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.coverage.summary.functions.percentage}%</div>
                <div>Functions</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.coverage.summary.branches.percentage}%</div>
                <div>Branches</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.coverage.summary.statements.percentage}%</div>
                <div>Statements</div>
            </div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Test Suites</h2>
        ${report.testSuites.map(suite => `
            <div class="test-suite">
                <h3>${suite.name} (${suite.duration}ms)</h3>
                <p>Tests: ${suite.tests.passed}/${suite.tests.total} passed</p>
                ${suite.testCases.filter(test => test.status === 'failed').map(test => `
                    <div class="test-case failed">
                        <strong>${test.title}</strong>
                        ${test.failureMessages.map(msg => `<pre>${msg}</pre>`).join('')}
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Performance</h2>
        <h3>Slowest Tests</h3>
        ${report.performance.slowestTests.map(test => `
            <div class="performance-item">
                <span>${test.name}</span>
                <span>${test.duration}ms</span>
            </div>
        `).join('')}
    </div>

    ${report.coverage ? `
    <div class="section">
        <h2>File Coverage</h2>
        ${report.coverage.files.map(file => `
            <div class="coverage-file">
                <span>${file.path}</span>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${file.lines.percentage}%"></div>
                </div>
                <span>${file.lines.percentage}%</span>
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
}

function logTestSummary(report) {
  console.log('\n📊 PHASE 6 TEST SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`✅ Passed: ${report.summary.passedTests}`);
  console.log(`❌ Failed: ${report.summary.failedTests}`);
  console.log(`⏸️  Pending: ${report.summary.pendingTests}`);
  console.log(`Pass Rate: ${report.summary.passRate}`);
  console.log(`Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);
  
  if (report.coverage) {
    console.log('\n📈 COVERAGE SUMMARY');
    console.log('===================');
    console.log(`Lines: ${report.coverage.summary.lines.percentage}%`);
    console.log(`Functions: ${report.coverage.summary.functions.percentage}%`);
    console.log(`Branches: ${report.coverage.summary.branches.percentage}%`);
    console.log(`Statements: ${report.coverage.summary.statements.percentage}%`);
  }
  
  if (report.summary.failedTests > 0) {
    console.log('\n❌ FAILED TESTS');
    console.log('================');
    report.testSuites.forEach(suite => {
      const failedTests = suite.testCases.filter(test => test.status === 'failed');
      if (failedTests.length > 0) {
        console.log(`\n${suite.name}:`);
        failedTests.forEach(test => {
          console.log(`  - ${test.title}`);
        });
      }
    });
  }
  
  console.log('\n🚀 PERFORMANCE');
  console.log('===============');
  console.log(`Average Test Time: ${report.performance.averageTestTime.toFixed(2)}ms`);
  if (report.performance.slowestTests.length > 0) {
    console.log('Slowest Tests:');
    report.performance.slowestTests.slice(0, 3).forEach(test => {
      console.log(`  - ${test.name}: ${test.duration}ms`);
    });
  }
  
  console.log(`\n📄 Detailed report: coverage/test-summary.html`);
}
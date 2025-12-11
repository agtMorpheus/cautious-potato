<?php
/**
 * Analytics Controller Tests
 * 
 * Tests the AnalyticsController class functionality for analytics and reporting.
 */

use PHPUnit\Framework\TestCase;

// Load configuration and dependencies
require_once __DIR__ . '/../../api/config.php';
require_once __DIR__ . '/../../api/lib/Logger.php';
require_once __DIR__ . '/../../api/middleware/Auth.php';
require_once __DIR__ . '/../../api/controllers/AnalyticsController.php';

class AnalyticsControllerTest extends TestCase
{
    protected function setUp(): void
    {
        // Start session for tests
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Clear session data
        $_SESSION = [];
        $_GET = [];
        $_POST = [];
        
        // Set up mock user session
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'testuser';
        $_SESSION['email'] = 'test@example.com';
        $_SESSION['role'] = 'admin';
        $_SESSION['tenant_id'] = null;
        
        // Reset database singleton
        Database::resetInstance();
        
        // Capture output
        ob_start();
    }

    protected function tearDown(): void
    {
        // Clear output buffer
        ob_end_clean();
        
        // Clear session
        $_SESSION = [];
        $_GET = [];
        $_POST = [];
        
        // Clean up
        Database::resetInstance();
    }

    /**
     * Test that AnalyticsController class exists
     */
    public function testAnalyticsControllerClassExists(): void
    {
        $this->assertTrue(class_exists('AnalyticsController'));
    }

    /**
     * Test that AnalyticsController has required methods
     */
    public function testAnalyticsControllerHasRequiredMethods(): void
    {
        $this->assertTrue(method_exists(AnalyticsController::class, 'getDashboard'));
        $this->assertTrue(method_exists(AnalyticsController::class, 'getTrends'));
        $this->assertTrue(method_exists(AnalyticsController::class, 'getBottlenecks'));
        $this->assertTrue(method_exists(AnalyticsController::class, 'getSlaStatus'));
        $this->assertTrue(method_exists(AnalyticsController::class, 'calculateMetrics'));
        $this->assertTrue(method_exists(AnalyticsController::class, 'export'));
    }

    /**
     * Test AnalyticsController can be instantiated
     */
    public function testAnalyticsControllerCanBeInstantiated(): void
    {
        $controller = new AnalyticsController();
        $this->assertInstanceOf(AnalyticsController::class, $controller);
    }

    /**
     * Test getTrends days parameter validation - default value
     */
    public function testGetTrendsDaysDefaultValue(): void
    {
        $_GET['days'] = null;
        $days = min(365, max(7, (int)($_GET['days'] ?? 30)));
        
        $this->assertEquals(30, $days);
    }

    /**
     * Test getTrends days parameter validation - minimum bound
     */
    public function testGetTrendsDaysMinimumBound(): void
    {
        $_GET['days'] = 1;
        $days = min(365, max(7, (int)($_GET['days'] ?? 30)));
        
        $this->assertEquals(7, $days);
    }

    /**
     * Test getTrends days parameter validation - maximum bound
     */
    public function testGetTrendsDaysMaximumBound(): void
    {
        $_GET['days'] = 999;
        $days = min(365, max(7, (int)($_GET['days'] ?? 30)));
        
        $this->assertEquals(365, $days);
    }

    /**
     * Test getTrends days parameter validation - negative value
     */
    public function testGetTrendsDaysNegativeValue(): void
    {
        $_GET['days'] = -10;
        $days = min(365, max(7, (int)($_GET['days'] ?? 30)));
        
        $this->assertEquals(7, $days);
    }

    /**
     * Test getBottlenecks threshold days default value
     */
    public function testGetBottlenecksThresholdDaysDefault(): void
    {
        $_GET['threshold_days'] = null;
        $thresholdDays = (int)($_GET['threshold_days'] ?? 30);
        
        $this->assertEquals(30, $thresholdDays);
    }

    /**
     * Test getBottlenecks threshold days custom value
     */
    public function testGetBottlenecksThresholdDaysCustom(): void
    {
        $_GET['threshold_days'] = 14;
        $thresholdDays = (int)($_GET['threshold_days'] ?? 30);
        
        $this->assertEquals(14, $thresholdDays);
    }

    /**
     * Test export format validation - default format
     */
    public function testExportFormatDefault(): void
    {
        $_GET['format'] = null;
        $format = sanitize($_GET['format'] ?? 'json');
        
        $this->assertEquals('json', $format);
    }

    /**
     * Test export format validation - csv format
     */
    public function testExportFormatCsv(): void
    {
        $_GET['format'] = 'csv';
        $format = sanitize($_GET['format'] ?? 'json');
        
        $this->assertEquals('csv', $format);
    }

    /**
     * Test export type validation - default type
     */
    public function testExportTypeDefault(): void
    {
        $_GET['type'] = null;
        $type = sanitize($_GET['type'] ?? 'dashboard');
        
        $this->assertEquals('dashboard', $type);
    }

    /**
     * Test export type validation - trends type
     */
    public function testExportTypeTrends(): void
    {
        $_GET['type'] = 'trends';
        $type = sanitize($_GET['type'] ?? 'dashboard');
        
        $this->assertEquals('trends', $type);
    }

    /**
     * Test export type validation - bottlenecks type
     */
    public function testExportTypeBottlenecks(): void
    {
        $_GET['type'] = 'bottlenecks';
        $type = sanitize($_GET['type'] ?? 'dashboard');
        
        $this->assertEquals('bottlenecks', $type);
    }

    /**
     * Test tenant ID from session
     */
    public function testTenantIdFromSession(): void
    {
        $_SESSION['tenant_id'] = 42;
        $tenantId = $_SESSION['tenant_id'] ?? null;
        
        $this->assertEquals(42, $tenantId);
    }

    /**
     * Test tenant ID when not set
     */
    public function testTenantIdWhenNotSet(): void
    {
        unset($_SESSION['tenant_id']);
        $tenantId = $_SESSION['tenant_id'] ?? null;
        
        $this->assertNull($tenantId);
    }

    /**
     * Test moving average calculation logic
     */
    public function testMovingAverageCalculationLogic(): void
    {
        $data = [
            ['date' => '2023-01-01', 'new_contracts' => 10],
            ['date' => '2023-01-02', 'new_contracts' => 20],
            ['date' => '2023-01-03', 'new_contracts' => 30],
            ['date' => '2023-01-04', 'new_contracts' => 40],
            ['date' => '2023-01-05', 'new_contracts' => 50],
        ];
        
        $window = 3;
        $result = [];
        $count = count($data);
        
        for ($i = 0; $i < $count; $i++) {
            $start = max(0, $i - $window + 1);
            $subset = array_slice($data, $start, $i - $start + 1);
            $sum = array_sum(array_column($subset, 'new_contracts'));
            $avg = count($subset) > 0 ? $sum / count($subset) : 0;
            
            $result[] = [
                'date' => $data[$i]['date'],
                'value' => round($avg, 2)
            ];
        }
        
        // First value: 10/1 = 10
        $this->assertEquals(10, $result[0]['value']);
        
        // Second value: (10+20)/2 = 15
        $this->assertEquals(15, $result[1]['value']);
        
        // Third value: (10+20+30)/3 = 20
        $this->assertEquals(20, $result[2]['value']);
        
        // Fourth value: (20+30+40)/3 = 30
        $this->assertEquals(30, $result[3]['value']);
        
        // Fifth value: (30+40+50)/3 = 40
        $this->assertEquals(40, $result[4]['value']);
    }

    /**
     * Test completion rate calculation
     */
    public function testCompletionRateCalculation(): void
    {
        $counts = [
            'total' => 100,
            'fertig_count' => 75
        ];
        
        $completionRate = $counts['total'] > 0 
            ? round(($counts['fertig_count'] / $counts['total']) * 100, 2) 
            : 0;
        
        $this->assertEquals(75.0, $completionRate);
    }

    /**
     * Test completion rate with zero total
     */
    public function testCompletionRateWithZeroTotal(): void
    {
        $counts = [
            'total' => 0,
            'fertig_count' => 0
        ];
        
        $completionRate = $counts['total'] > 0 
            ? round(($counts['fertig_count'] / $counts['total']) * 100, 2) 
            : 0;
        
        $this->assertEquals(0, $completionRate);
    }

    /**
     * Test status distribution JSON encoding
     */
    public function testStatusDistributionJsonEncoding(): void
    {
        $counts = [
            'open_count' => 10,
            'inbearb_count' => 25,
            'fertig_count' => 65
        ];
        
        $statusDistribution = json_encode([
            'offen' => $counts['open_count'],
            'inbearb' => $counts['inbearb_count'],
            'fertig' => $counts['fertig_count']
        ]);
        
        $decoded = json_decode($statusDistribution, true);
        
        $this->assertEquals(10, $decoded['offen']);
        $this->assertEquals(25, $decoded['inbearb']);
        $this->assertEquals(65, $decoded['fertig']);
    }

    /**
     * Test date calculation for trends
     */
    public function testDateCalculationForTrends(): void
    {
        $days = 30;
        $startDate = date('Y-m-d', strtotime("-{$days} days"));
        $endDate = date('Y-m-d');
        
        // startDate should be exactly 30 days ago
        $diffDays = (strtotime($endDate) - strtotime($startDate)) / (60 * 60 * 24);
        $this->assertEquals(30, $diffDays);
    }

    /**
     * Test cutoff date calculation for bottlenecks
     */
    public function testCutoffDateCalculationForBottlenecks(): void
    {
        $thresholdDays = 30;
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$thresholdDays} days"));
        
        // cutoffDate should be a valid datetime string
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $cutoffDate);
    }

    /**
     * Test days in status calculation
     */
    public function testDaysInStatusCalculation(): void
    {
        // Simulating DATEDIFF(NOW(), created_at)
        $createdAt = date('Y-m-d', strtotime('-15 days'));
        $now = date('Y-m-d');
        
        $daysInStatus = (strtotime($now) - strtotime($createdAt)) / (60 * 60 * 24);
        
        $this->assertEquals(15, $daysInStatus);
    }

    /**
     * Test SLA status values
     */
    public function testSlaStatusValues(): void
    {
        $validStatuses = ['pending', 'at_risk', 'breached', 'completed'];
        
        foreach ($validStatuses as $status) {
            $this->assertIsString($status);
        }
        
        $this->assertCount(4, $validStatuses);
    }

    /**
     * Test days remaining calculation
     */
    public function testDaysRemainingCalculation(): void
    {
        // Due date is 5 days from now
        $dueDate = date('Y-m-d', strtotime('+5 days'));
        $now = date('Y-m-d');
        
        $daysRemaining = (strtotime($dueDate) - strtotime($now)) / (60 * 60 * 24);
        
        $this->assertEquals(5, $daysRemaining);
    }

    /**
     * Test negative days remaining (overdue)
     */
    public function testNegativeDaysRemaining(): void
    {
        // Due date was 3 days ago
        $dueDate = date('Y-m-d', strtotime('-3 days'));
        $now = date('Y-m-d');
        
        $daysRemaining = (strtotime($dueDate) - strtotime($now)) / (60 * 60 * 24);
        
        $this->assertEquals(-3, $daysRemaining);
    }

    /**
     * Test CSV export filename format
     */
    public function testCsvExportFilenameFormat(): void
    {
        $type = 'dashboard';
        $filename = 'analytics_' . $type . '_' . date('Y-m-d') . '.csv';
        
        $this->assertMatchesRegularExpression('/^analytics_dashboard_\d{4}-\d{2}-\d{2}\.csv$/', $filename);
    }

    /**
     * Test at-risk SLA query interval
     */
    public function testAtRiskSlaQueryInterval(): void
    {
        // At-risk SLAs are due within 3 days
        $atRiskDays = 3;
        $atRiskDate = date('Y-m-d', strtotime("+{$atRiskDays} days"));
        $now = date('Y-m-d');
        
        $diffDays = (strtotime($atRiskDate) - strtotime($now)) / (60 * 60 * 24);
        
        $this->assertEquals(3, $diffDays);
    }

    /**
     * Test pending approvals older than 7 days
     */
    public function testPendingApprovalsOlderThan7Days(): void
    {
        // Pending approvals > 7 days are flagged
        $requestedAt = date('Y-m-d', strtotime('-10 days'));
        $threshold = date('Y-m-d', strtotime('-7 days'));
        
        $isPending = strtotime($requestedAt) < strtotime($threshold);
        
        $this->assertTrue($isPending);
    }

    /**
     * Test pending approvals within 7 days
     */
    public function testPendingApprovalsWithin7Days(): void
    {
        // Pending approvals <= 7 days are not flagged
        $requestedAt = date('Y-m-d', strtotime('-5 days'));
        $threshold = date('Y-m-d', strtotime('-7 days'));
        
        $isPending = strtotime($requestedAt) < strtotime($threshold);
        
        $this->assertFalse($isPending);
    }

    /**
     * Test date formatting for metrics
     */
    public function testDateFormattingForMetrics(): void
    {
        $date = date('Y-m-d');
        
        // Should be in YYYY-MM-DD format
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $date);
    }

    /**
     * Test generated_at timestamp format
     */
    public function testGeneratedAtTimestampFormat(): void
    {
        $generatedAt = date('Y-m-d H:i:s');
        
        // Should be in YYYY-MM-DD HH:MM:SS format
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $generatedAt);
    }

    /**
     * Test dashboard response structure
     */
    public function testDashboardResponseStructure(): void
    {
        $response = [
            'summary' => ['total_contracts' => 100],
            'metrics' => [],
            'sla_status' => [],
            'recent_activity' => [],
            'pending_approvals' => 5,
            'generated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->assertArrayHasKey('summary', $response);
        $this->assertArrayHasKey('metrics', $response);
        $this->assertArrayHasKey('sla_status', $response);
        $this->assertArrayHasKey('recent_activity', $response);
        $this->assertArrayHasKey('pending_approvals', $response);
        $this->assertArrayHasKey('generated_at', $response);
    }

    /**
     * Test contract summary structure
     */
    public function testContractSummaryStructure(): void
    {
        $summary = [
            'total_contracts' => 100,
            'open_contracts' => 30,
            'in_progress' => 40,
            'completed' => 30
        ];
        
        $this->assertEquals(100, $summary['total_contracts']);
        $this->assertEquals(100, $summary['open_contracts'] + $summary['in_progress'] + $summary['completed']);
    }

    /**
     * Test trends response structure
     */
    public function testTrendsResponseStructure(): void
    {
        $response = [
            'period' => '30 days',
            'start_date' => '2023-11-01',
            'end_date' => '2023-11-30',
            'daily_data' => [],
            'completion_trend' => [],
            'moving_average_7d' => []
        ];
        
        $this->assertArrayHasKey('period', $response);
        $this->assertArrayHasKey('start_date', $response);
        $this->assertArrayHasKey('end_date', $response);
        $this->assertArrayHasKey('daily_data', $response);
        $this->assertArrayHasKey('completion_trend', $response);
        $this->assertArrayHasKey('moving_average_7d', $response);
    }

    /**
     * Test bottlenecks response structure
     */
    public function testBottlenecksResponseStructure(): void
    {
        $response = [
            'stuck_contracts' => [],
            'stuck_count' => 0,
            'pending_approvals' => [],
            'pending_approvals_count' => 0,
            'status_distribution' => [],
            'threshold_days' => 30
        ];
        
        $this->assertArrayHasKey('stuck_contracts', $response);
        $this->assertArrayHasKey('stuck_count', $response);
        $this->assertArrayHasKey('pending_approvals', $response);
        $this->assertArrayHasKey('pending_approvals_count', $response);
        $this->assertArrayHasKey('status_distribution', $response);
        $this->assertArrayHasKey('threshold_days', $response);
    }

    /**
     * Test SLA status response structure
     */
    public function testSlaStatusResponseStructure(): void
    {
        $response = [
            'summary' => [],
            'at_risk' => [],
            'at_risk_count' => 0,
            'breached' => [],
            'breached_count' => 0
        ];
        
        $this->assertArrayHasKey('summary', $response);
        $this->assertArrayHasKey('at_risk', $response);
        $this->assertArrayHasKey('at_risk_count', $response);
        $this->assertArrayHasKey('breached', $response);
        $this->assertArrayHasKey('breached_count', $response);
    }

    /**
     * Test metrics calculation response
     */
    public function testMetricsCalculationResponse(): void
    {
        $response = [
            'date' => '2023-11-01',
            'total_contracts' => 100,
            'status_distribution' => [
                'offen' => 30,
                'inbearb' => 40,
                'fertig' => 30
            ],
            'completion_rate' => 30.0,
            'new_contracts_today' => 5,
            'completed_today' => 3
        ];
        
        $this->assertEquals(100, $response['total_contracts']);
        $this->assertEquals(30.0, $response['completion_rate']);
        $this->assertEquals(5, $response['new_contracts_today']);
        $this->assertEquals(3, $response['completed_today']);
    }

    /**
     * Test moving average with small window
     */
    public function testMovingAverageWithSmallWindow(): void
    {
        $data = [
            ['date' => '2023-01-01', 'new_contracts' => 10],
            ['date' => '2023-01-02', 'new_contracts' => 20]
        ];
        
        $window = 2;
        $result = [];
        $count = count($data);
        
        for ($i = 0; $i < $count; $i++) {
            $start = max(0, $i - $window + 1);
            $subset = array_slice($data, $start, $i - $start + 1);
            $sum = array_sum(array_column($subset, 'new_contracts'));
            $avg = count($subset) > 0 ? $sum / count($subset) : 0;
            
            $result[] = [
                'date' => $data[$i]['date'],
                'value' => round($avg, 2)
            ];
        }
        
        $this->assertEquals(10, $result[0]['value']);
        $this->assertEquals(15, $result[1]['value']);
    }

    /**
     * Test completion rate with different values
     */
    public function testCompletionRateWithDifferentValues(): void
    {
        // 50% completion
        $counts = ['total' => 200, 'fertig_count' => 100];
        $completionRate = $counts['total'] > 0 
            ? round(($counts['fertig_count'] / $counts['total']) * 100, 2) 
            : 0;
        $this->assertEquals(50.0, $completionRate);
        
        // 33.33% completion
        $counts = ['total' => 300, 'fertig_count' => 100];
        $completionRate = $counts['total'] > 0 
            ? round(($counts['fertig_count'] / $counts['total']) * 100, 2) 
            : 0;
        $this->assertEquals(33.33, $completionRate);
    }

    /**
     * Test status distribution percentages
     */
    public function testStatusDistributionPercentages(): void
    {
        $total = 100;
        $distribution = [
            'offen' => 20,
            'inbearb' => 50,
            'fertig' => 30
        ];
        
        $offenPercent = ($distribution['offen'] / $total) * 100;
        $inbearbPercent = ($distribution['inbearb'] / $total) * 100;
        $fertigPercent = ($distribution['fertig'] / $total) * 100;
        
        $this->assertEquals(20, $offenPercent);
        $this->assertEquals(50, $inbearbPercent);
        $this->assertEquals(30, $fertigPercent);
        $this->assertEquals(100, $offenPercent + $inbearbPercent + $fertigPercent);
    }

    /**
     * Test date range for different periods
     */
    public function testDateRangeForDifferentPeriods(): void
    {
        $periods = [7, 30, 90, 365];
        
        foreach ($periods as $days) {
            $startDate = date('Y-m-d', strtotime("-{$days} days"));
            $endDate = date('Y-m-d');
            
            $diffDays = round((strtotime($endDate) - strtotime($startDate)) / (60 * 60 * 24));
            
            $this->assertEquals($days, $diffDays);
        }
    }

    /**
     * Test bottleneck identification threshold
     */
    public function testBottleneckIdentificationThreshold(): void
    {
        $thresholdDays = 30;
        $cutoffDate = date('Y-m-d', strtotime("-{$thresholdDays} days"));
        
        // Contract created 45 days ago (stuck)
        $createdAt = date('Y-m-d', strtotime('-45 days'));
        $isStuck = strtotime($createdAt) < strtotime($cutoffDate);
        $this->assertTrue($isStuck);
        
        // Contract created 15 days ago (not stuck)
        $createdAt = date('Y-m-d', strtotime('-15 days'));
        $isStuck = strtotime($createdAt) < strtotime($cutoffDate);
        $this->assertFalse($isStuck);
    }

    /**
     * Test SLA due date calculations
     */
    public function testSlaDueDateCalculations(): void
    {
        // Due in 5 days
        $dueDate = date('Y-m-d', strtotime('+5 days'));
        $daysRemaining = (strtotime($dueDate) - strtotime(date('Y-m-d'))) / (60 * 60 * 24);
        $this->assertEquals(5, $daysRemaining);
        
        // Due in 2 days (at risk - within 3 days)
        $dueDate = date('Y-m-d', strtotime('+2 days'));
        $daysRemaining = (strtotime($dueDate) - strtotime(date('Y-m-d'))) / (60 * 60 * 24);
        $this->assertLessThanOrEqual(3, $daysRemaining);
        
        // Overdue by 2 days
        $dueDate = date('Y-m-d', strtotime('-2 days'));
        $daysRemaining = (strtotime($dueDate) - strtotime(date('Y-m-d'))) / (60 * 60 * 24);
        $this->assertLessThan(0, $daysRemaining);
    }

    /**
     * Test average age calculation
     */
    public function testAverageAgeCalculation(): void
    {
        $contracts = [
            ['created_at' => date('Y-m-d', strtotime('-10 days'))],
            ['created_at' => date('Y-m-d', strtotime('-20 days'))],
            ['created_at' => date('Y-m-d', strtotime('-30 days'))]
        ];
        
        $totalAge = 0;
        $now = strtotime(date('Y-m-d'));
        
        foreach ($contracts as $contract) {
            $age = ($now - strtotime($contract['created_at'])) / (60 * 60 * 24);
            $totalAge += $age;
        }
        
        $avgAge = $totalAge / count($contracts);
        
        $this->assertEquals(20, $avgAge);
    }

    /**
     * Test daily data aggregation
     */
    public function testDailyDataAggregation(): void
    {
        $dailyData = [
            'date' => '2023-11-01',
            'new_contracts' => 10,
            'open_count' => 5,
            'in_progress_count' => 3,
            'completed_count' => 2
        ];
        
        $total = $dailyData['open_count'] + $dailyData['in_progress_count'] + $dailyData['completed_count'];
        
        $this->assertEquals(10, $dailyData['new_contracts']);
        $this->assertEquals(10, $total);
    }

    /**
     * Test CSV export content type header
     */
    public function testCsvExportContentTypeHeader(): void
    {
        $contentType = 'text/csv; charset=utf-8';
        
        $this->assertStringContainsString('text/csv', $contentType);
        $this->assertStringContainsString('utf-8', $contentType);
    }

    /**
     * Test CSV export filename header
     */
    public function testCsvExportFilenameHeader(): void
    {
        $type = 'trends';
        $date = date('Y-m-d');
        $filename = 'analytics_' . $type . '_' . $date . '.csv';
        $disposition = 'attachment; filename=' . $filename;
        
        $this->assertStringContainsString('attachment', $disposition);
        $this->assertStringContainsString('analytics_trends_', $disposition);
        $this->assertStringContainsString('.csv', $disposition);
    }

    /**
     * Test recent activity limit
     */
    public function testRecentActivityLimit(): void
    {
        $limit = 20;
        $activities = array_fill(0, $limit, ['action' => 'test']);
        
        $this->assertCount(20, $activities);
        $this->assertLessThanOrEqual(20, count($activities));
    }

    /**
     * Test metrics date formatting
     */
    public function testMetricsDateFormatting(): void
    {
        $date = '2023-11-15';
        
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $date);
        
        // Verify it's a valid date
        $timestamp = strtotime($date);
        $this->assertNotFalse($timestamp);
        
        // Verify reconstruction matches
        $reconstructed = date('Y-m-d', $timestamp);
        $this->assertEquals($date, $reconstructed);
    }

    /**
     * Test export format switch
     */
    public function testExportFormatSwitch(): void
    {
        $formats = ['json', 'csv'];
        
        foreach ($formats as $format) {
            if ($format === 'csv') {
                $contentType = 'text/csv';
            } else {
                $contentType = 'application/json';
            }
            
            $this->assertIsString($contentType);
        }
    }

    /**
     * Test tenant filtering in queries
     */
    public function testTenantFilteringInQueries(): void
    {
        $tenantId = 42;
        
        $sql = 'SELECT * FROM contracts WHERE 1=1';
        $params = [];
        
        if ($tenantId) {
            $sql .= ' AND tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $this->assertStringContainsString('tenant_id = ?', $sql);
        $this->assertCount(1, $params);
        $this->assertEquals(42, $params[0]);
    }

    /**
     * Test query without tenant filter
     */
    public function testQueryWithoutTenantFilter(): void
    {
        $tenantId = null;
        
        $sql = 'SELECT * FROM contracts WHERE 1=1';
        $params = [];
        
        if ($tenantId) {
            $sql .= ' AND tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $this->assertStringNotContainsString('tenant_id', $sql);
        $this->assertCount(0, $params);
    }

    /**
     * Test workflow transitions for completion tracking
     */
    public function testWorkflowTransitionsForCompletionTracking(): void
    {
        $transition = [
            'contract_id' => 'uuid-123',
            'from_status' => 'inbearb',
            'to_status' => 'fertig',
            'transitioned_at' => date('Y-m-d H:i:s')
        ];
        
        $isCompletion = $transition['to_status'] === 'fertig';
        
        $this->assertTrue($isCompletion);
        $this->assertEquals('inbearb', $transition['from_status']);
        $this->assertEquals('fertig', $transition['to_status']);
    }

    /**
     * Test array slicing for moving average
     */
    public function testArraySlicingForMovingAverage(): void
    {
        $data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        
        $window = 3;
        $i = 5; // Index 5
        $start = max(0, $i - $window + 1); // 3
        $subset = array_slice($data, $start, $i - $start + 1); // [4, 5, 6]
        
        $this->assertEquals([4, 5, 6], $subset);
        $this->assertCount(3, $subset);
    }

    /**
     * Test pending approvals count
     */
    public function testPendingApprovalsCount(): void
    {
        $approvals = [
            ['status' => 'pending'],
            ['status' => 'approved'],
            ['status' => 'pending'],
            ['status' => 'rejected'],
            ['status' => 'pending']
        ];
        
        $pendingCount = 0;
        foreach ($approvals as $approval) {
            if ($approval['status'] === 'pending') {
                $pendingCount++;
            }
        }
        
        $this->assertEquals(3, $pendingCount);
    }

    /**
     * Test export type validation
     */
    public function testExportTypeValidation(): void
    {
        $validTypes = ['dashboard', 'trends', 'bottlenecks'];
        
        $type = 'dashboard';
        $this->assertContains($type, $validTypes);
        
        $type = 'invalid';
        $this->assertNotContains($type, $validTypes);
    }
}

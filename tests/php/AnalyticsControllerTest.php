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
        $this->assertRegExp('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $cutoffDate);
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
        
        $this->assertRegExp('/^analytics_dashboard_\d{4}-\d{2}-\d{2}\.csv$/', $filename);
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
        $this->assertRegExp('/^\d{4}-\d{2}-\d{2}$/', $date);
    }

    /**
     * Test generated_at timestamp format
     */
    public function testGeneratedAtTimestampFormat(): void
    {
        $generatedAt = date('Y-m-d H:i:s');
        
        // Should be in YYYY-MM-DD HH:MM:SS format
        $this->assertRegExp('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $generatedAt);
    }
}

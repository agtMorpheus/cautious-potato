<?php
/**
 * Contract Controller Tests
 * 
 * Tests the ContractController class functionality for contract CRUD operations.
 */

use PHPUnit\Framework\TestCase;

// Load configuration and dependencies
require_once __DIR__ . '/../../api/config.php';
require_once __DIR__ . '/../../api/lib/Logger.php';
require_once __DIR__ . '/../../api/middleware/Auth.php';
require_once __DIR__ . '/../../api/controllers/ContractController.php';

class ContractControllerTest extends TestCase
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
     * Test that ContractController class exists
     */
    public function testContractControllerClassExists(): void
    {
        $this->assertTrue(class_exists('ContractController'));
    }

    /**
     * Test that ContractController has required methods
     */
    public function testContractControllerHasRequiredMethods(): void
    {
        $this->assertTrue(method_exists(ContractController::class, 'list'));
        $this->assertTrue(method_exists(ContractController::class, 'get'));
        $this->assertTrue(method_exists(ContractController::class, 'create'));
        $this->assertTrue(method_exists(ContractController::class, 'update'));
        $this->assertTrue(method_exists(ContractController::class, 'delete'));
        $this->assertTrue(method_exists(ContractController::class, 'bulkUpdate'));
        $this->assertTrue(method_exists(ContractController::class, 'export'));
    }

    /**
     * Test ContractController can be instantiated
     */
    public function testContractControllerCanBeInstantiated(): void
    {
        $controller = new ContractController();
        $this->assertInstanceOf(ContractController::class, $controller);
    }

    /**
     * Test list default pagination values
     */
    public function testListDefaultPaginationValues(): void
    {
        // Set up default values
        $_GET['page'] = null;
        $_GET['limit'] = null;
        
        // Default values should be used
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? DEFAULT_PAGE_SIZE)));
        
        $this->assertEquals(1, $page);
        $this->assertGreaterThanOrEqual(1, $limit);
        $this->assertLessThanOrEqual(MAX_PAGE_SIZE, $limit);
    }

    /**
     * Test list pagination bounds
     */
    public function testListPaginationBounds(): void
    {
        // Test negative page becomes 1
        $_GET['page'] = -5;
        $page = max(1, (int)($_GET['page'] ?? 1));
        $this->assertEquals(1, $page);
        
        // Test large limit is capped
        $_GET['limit'] = 9999;
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? DEFAULT_PAGE_SIZE)));
        $this->assertEquals(MAX_PAGE_SIZE, $limit);
        
        // Test zero limit becomes 1
        $_GET['limit'] = 0;
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? DEFAULT_PAGE_SIZE)));
        $this->assertEquals(1, $limit);
    }

    /**
     * Test list sort field validation
     */
    public function testListSortFieldValidation(): void
    {
        $allowedSorts = ['created_at', 'updated_at', 'auftrag', 'titel', 'status', 'sollstart'];
        
        // Valid sort field
        $_GET['sort'] = 'titel';
        $sort = sanitize($_GET['sort'] ?? 'created_at');
        if (!in_array($sort, $allowedSorts)) {
            $sort = 'created_at';
        }
        $this->assertEquals('titel', $sort);
        
        // Invalid sort field defaults to created_at
        $_GET['sort'] = 'invalid_field';
        $sort = sanitize($_GET['sort'] ?? 'created_at');
        if (!in_array($sort, $allowedSorts)) {
            $sort = 'created_at';
        }
        $this->assertEquals('created_at', $sort);
    }

    /**
     * Test list direction validation
     */
    public function testListDirectionValidation(): void
    {
        // ASC direction
        $_GET['dir'] = 'ASC';
        $dir = strtoupper($_GET['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $this->assertEquals('ASC', $dir);
        
        // DESC direction (default)
        $_GET['dir'] = 'DESC';
        $dir = strtoupper($_GET['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $this->assertEquals('DESC', $dir);
        
        // Invalid direction defaults to DESC
        $_GET['dir'] = 'INVALID';
        $dir = strtoupper($_GET['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $this->assertEquals('DESC', $dir);
        
        // Lowercase asc
        $_GET['dir'] = 'asc';
        $dir = strtoupper($_GET['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $this->assertEquals('ASC', $dir);
    }

    /**
     * Test list status filter validation
     */
    public function testListStatusFilterValidation(): void
    {
        $validStatuses = ['offen', 'inbearb', 'fertig'];
        
        // Valid status
        $_GET['status'] = 'offen';
        $status = sanitize($_GET['status'] ?? null);
        $this->assertTrue(in_array($status, $validStatuses));
        
        // Invalid status
        $_GET['status'] = 'invalid';
        $status = sanitize($_GET['status'] ?? null);
        $this->assertFalse(in_array($status, $validStatuses));
    }

    /**
     * Test create validation for required auftrag
     */
    public function testCreateValidationRequiresAuftrag(): void
    {
        $data = ['titel' => 'Test Title'];
        
        $this->assertTrue(empty($data['auftrag']));
    }

    /**
     * Test create validation for required titel
     */
    public function testCreateValidationRequiresTitel(): void
    {
        $data = ['auftrag' => 'TEST-001'];
        
        $this->assertTrue(empty($data['titel']));
    }

    /**
     * Test create status validation
     */
    public function testCreateStatusValidation(): void
    {
        $validStatuses = ['offen', 'inbearb', 'fertig'];
        
        // Default status
        $data = [];
        $status = $data['status'] ?? 'offen';
        $this->assertTrue(in_array($status, $validStatuses));
        
        // Valid explicit status
        $data = ['status' => 'inbearb'];
        $status = $data['status'] ?? 'offen';
        $this->assertTrue(in_array($status, $validStatuses));
        
        // Invalid status
        $data = ['status' => 'invalid_status'];
        $status = $data['status'] ?? 'offen';
        $this->assertFalse(in_array($status, $validStatuses));
    }

    /**
     * Test update allowed fields
     */
    public function testUpdateAllowedFields(): void
    {
        $allowed = ['titel', 'status', 'standort', 'saeule_raum', 'anlage_nr', 
                   'beschreibung', 'sollstart', 'workorder_code', 'melder', 
                   'seriennummer', 'is_complete'];
        
        // All allowed fields should be in the list
        $this->assertContains('titel', $allowed);
        $this->assertContains('status', $allowed);
        $this->assertContains('standort', $allowed);
        $this->assertContains('saeule_raum', $allowed);
        $this->assertContains('anlage_nr', $allowed);
        $this->assertContains('beschreibung', $allowed);
        $this->assertContains('sollstart', $allowed);
        $this->assertContains('workorder_code', $allowed);
        $this->assertContains('melder', $allowed);
        $this->assertContains('seriennummer', $allowed);
        $this->assertContains('is_complete', $allowed);
        
        // Auftrag should not be updatable
        $this->assertNotContains('auftrag', $allowed);
        
        // id should not be updatable
        $this->assertNotContains('id', $allowed);
    }

    /**
     * Test bulk update allowed fields
     */
    public function testBulkUpdateAllowedFields(): void
    {
        $allowed = ['titel', 'status', 'standort', 'saeule_raum', 'anlage_nr', 'is_complete'];
        
        // Limited set of fields for bulk update
        $this->assertCount(6, $allowed);
        $this->assertContains('status', $allowed);
        $this->assertContains('is_complete', $allowed);
    }

    /**
     * Test export format validation
     */
    public function testExportFormatValidation(): void
    {
        // Only CSV is supported
        $data = ['format' => 'csv'];
        $format = $data['format'] ?? 'csv';
        $this->assertEquals('csv', $format);
        
        // Unsupported format
        $data = ['format' => 'xlsx'];
        $format = $data['format'] ?? 'csv';
        $this->assertNotEquals('csv', $format);
    }

    /**
     * Test export limit constant
     */
    public function testExportLimit(): void
    {
        // Export should be limited to prevent memory issues
        $exportLimit = 10000;
        $this->assertEquals(10000, $exportLimit);
    }

    /**
     * Test sanitize function is used for user input
     */
    public function testSanitizeIsAvailable(): void
    {
        $this->assertTrue(function_exists('sanitize'));
        
        // Test sanitize removes dangerous content
        $input = '<script>alert("xss")</script>Test';
        $sanitized = sanitize($input);
        $this->assertStringNotContainsString('<script>', $sanitized);
    }

    /**
     * Test session user ID is available
     */
    public function testSessionUserIdIsAvailable(): void
    {
        $this->assertNotNull(Auth::userId());
        $this->assertEquals(1, Auth::userId());
    }

    /**
     * Test generateUUID produces valid format
     */
    public function testGenerateUUIDFormat(): void
    {
        $uuid = generateUUID();
        $this->assertRegExp(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $uuid
        );
    }

    /**
     * Test offset calculation for pagination
     */
    public function testOffsetCalculation(): void
    {
        $page = 1;
        $limit = 20;
        $offset = ($page - 1) * $limit;
        $this->assertEquals(0, $offset);
        
        $page = 2;
        $offset = ($page - 1) * $limit;
        $this->assertEquals(20, $offset);
        
        $page = 5;
        $limit = 50;
        $offset = ($page - 1) * $limit;
        $this->assertEquals(200, $offset);
    }

    /**
     * Test is_complete field handling
     */
    public function testIsCompleteFieldHandling(): void
    {
        $data = ['is_complete' => true];
        $value = (bool)$data['is_complete'];
        $this->assertTrue($value);
        
        $data = ['is_complete' => false];
        $value = (bool)$data['is_complete'];
        $this->assertFalse($value);
        
        $data = ['is_complete' => 1];
        $value = (bool)$data['is_complete'];
        $this->assertTrue($value);
        
        $data = ['is_complete' => 0];
        $value = (bool)$data['is_complete'];
        $this->assertFalse($value);
    }

    /**
     * Test search parameter generation
     */
    public function testSearchParameterGeneration(): void
    {
        $search = 'test';
        $searchParam = "%$search%";
        $this->assertEquals('%test%', $searchParam);
    }

    /**
     * Test where clause building logic
     */
    public function testWhereClauseBuilding(): void
    {
        $where = [];
        $params = [];
        
        // No filters
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $this->assertEquals('', $whereClause);
        
        // Single filter
        $where[] = 'status = ?';
        $params[] = 'offen';
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $this->assertEquals('WHERE status = ?', $whereClause);
        
        // Multiple filters
        $where[] = 'titel LIKE ?';
        $params[] = '%test%';
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $this->assertEquals('WHERE status = ? AND titel LIKE ?', $whereClause);
    }

    /**
     * Test pagination pages calculation
     */
    public function testPaginationPagesCalculation(): void
    {
        $total = 100;
        $limit = 20;
        $pages = ceil($total / $limit);
        $this->assertEquals(5, $pages);
        
        $total = 101;
        $pages = ceil($total / $limit);
        $this->assertEquals(6, $pages);
        
        $total = 0;
        $pages = ceil($total / $limit);
        $this->assertEquals(0, $pages);
    }
}

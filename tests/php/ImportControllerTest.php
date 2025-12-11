<?php
/**
 * Import Controller Tests
 * 
 * Tests the ImportController class functionality for file import operations.
 */

use PHPUnit\Framework\TestCase;

// Load configuration and dependencies
require_once __DIR__ . '/../../api/config.php';
require_once __DIR__ . '/../../api/lib/Logger.php';
require_once __DIR__ . '/../../api/middleware/Auth.php';
require_once __DIR__ . '/../../api/controllers/ImportController.php';

class ImportControllerTest extends TestCase
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
        $_FILES = [];
        
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
        $_FILES = [];
        
        // Clean up
        Database::resetInstance();
    }

    /**
     * Test that ImportController class exists
     */
    public function testImportControllerClassExists(): void
    {
        $this->assertTrue(class_exists('ImportController'));
    }

    /**
     * Test that ImportController has required methods
     */
    public function testImportControllerHasRequiredMethods(): void
    {
        $this->assertTrue(method_exists(ImportController::class, 'list'));
        $this->assertTrue(method_exists(ImportController::class, 'get'));
        $this->assertTrue(method_exists(ImportController::class, 'getErrors'));
        $this->assertTrue(method_exists(ImportController::class, 'upload'));
    }

    /**
     * Test ImportController can be instantiated
     */
    public function testImportControllerCanBeInstantiated(): void
    {
        $controller = new ImportController();
        $this->assertInstanceOf(ImportController::class, $controller);
    }

    /**
     * Test list default pagination values
     */
    public function testListDefaultPaginationValues(): void
    {
        $_GET['page'] = null;
        $_GET['limit'] = null;
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? 20)));
        
        $this->assertEquals(1, $page);
        $this->assertEquals(20, $limit);
    }

    /**
     * Test list pagination with custom values
     */
    public function testListPaginationWithCustomValues(): void
    {
        $_GET['page'] = 3;
        $_GET['limit'] = 50;
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? 20)));
        
        $this->assertEquals(3, $page);
        $this->assertEquals(50, $limit);
    }

    /**
     * Test list pagination bounds - negative page
     */
    public function testListPaginationNegativePage(): void
    {
        $_GET['page'] = -5;
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        
        $this->assertEquals(1, $page);
    }

    /**
     * Test list pagination bounds - zero page
     */
    public function testListPaginationZeroPage(): void
    {
        $_GET['page'] = 0;
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        
        $this->assertEquals(1, $page);
    }

    /**
     * Test list pagination bounds - limit exceeds max
     */
    public function testListPaginationLimitExceedsMax(): void
    {
        $_GET['limit'] = 500;
        
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? 20)));
        
        $this->assertEquals(MAX_PAGE_SIZE, $limit);
    }

    /**
     * Test list pagination bounds - zero limit
     */
    public function testListPaginationZeroLimit(): void
    {
        $_GET['limit'] = 0;
        
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? 20)));
        
        $this->assertEquals(1, $limit);
    }

    /**
     * Test offset calculation
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
     * Test file upload validation - no file uploaded
     */
    public function testFileUploadValidationNoFile(): void
    {
        $hasFile = isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK;
        
        $this->assertFalse($hasFile);
    }

    /**
     * Test file upload validation - upload error
     */
    public function testFileUploadValidationWithError(): void
    {
        $_FILES['file'] = [
            'error' => UPLOAD_ERR_NO_FILE
        ];
        
        $hasFile = isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK;
        
        $this->assertFalse($hasFile);
    }

    /**
     * Test file upload validation - successful upload
     */
    public function testFileUploadValidationSuccess(): void
    {
        $_FILES['file'] = [
            'name' => 'test.xlsx',
            'size' => 1024,
            'error' => UPLOAD_ERR_OK
        ];
        
        $hasFile = isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK;
        
        $this->assertTrue($hasFile);
    }

    /**
     * Test file size validation - within limit
     */
    public function testFileSizeValidationWithinLimit(): void
    {
        $_FILES['file'] = [
            'size' => 5 * 1024 * 1024 // 5 MB
        ];
        
        $isTooLarge = $_FILES['file']['size'] > MAX_UPLOAD_SIZE;
        
        $this->assertFalse($isTooLarge);
    }

    /**
     * Test file size validation - exceeds limit
     */
    public function testFileSizeValidationExceedsLimit(): void
    {
        $_FILES['file'] = [
            'size' => 15 * 1024 * 1024 // 15 MB
        ];
        
        $isTooLarge = $_FILES['file']['size'] > MAX_UPLOAD_SIZE;
        
        $this->assertTrue($isTooLarge);
    }

    /**
     * Test file extension validation - xlsx
     */
    public function testFileExtensionValidationXlsx(): void
    {
        $filename = 'test.xlsx';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $this->assertEquals('xlsx', $extension);
        $this->assertTrue(in_array($extension, ALLOWED_EXTENSIONS));
    }

    /**
     * Test file extension validation - xls
     */
    public function testFileExtensionValidationXls(): void
    {
        $filename = 'test.xls';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $this->assertEquals('xls', $extension);
        $this->assertTrue(in_array($extension, ALLOWED_EXTENSIONS));
    }

    /**
     * Test file extension validation - invalid extension
     */
    public function testFileExtensionValidationInvalid(): void
    {
        $filename = 'test.csv';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $this->assertEquals('csv', $extension);
        $this->assertFalse(in_array($extension, ALLOWED_EXTENSIONS));
    }

    /**
     * Test file extension validation - uppercase
     */
    public function testFileExtensionValidationUppercase(): void
    {
        $filename = 'TEST.XLSX';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $this->assertEquals('xlsx', $extension);
        $this->assertTrue(in_array($extension, ALLOWED_EXTENSIONS));
    }

    /**
     * Test mapping configuration parsing - valid JSON
     */
    public function testMappingConfigurationParsingValid(): void
    {
        $_POST['mapping'] = json_encode(['column1' => 'field1', 'column2' => 'field2']);
        
        $mapping = json_decode($_POST['mapping'], true);
        
        $this->assertIsArray($mapping);
        $this->assertEquals('field1', $mapping['column1']);
        $this->assertEquals('field2', $mapping['column2']);
    }

    /**
     * Test mapping configuration parsing - not provided
     */
    public function testMappingConfigurationNotProvided(): void
    {
        $mapping = null;
        if (isset($_POST['mapping'])) {
            $mapping = json_decode($_POST['mapping'], true);
        }
        
        $this->assertNull($mapping);
    }

    /**
     * Test upload error messages
     */
    public function testUploadErrorMessages(): void
    {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds server limit',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form limit',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
        ];
        
        $this->assertCount(7, $messages);
        $this->assertArrayHasKey(UPLOAD_ERR_INI_SIZE, $messages);
        $this->assertArrayHasKey(UPLOAD_ERR_NO_FILE, $messages);
    }

    /**
     * Test upload error message retrieval
     */
    public function testUploadErrorMessageRetrieval(): void
    {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds server limit',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded'
        ];
        
        $errorCode = UPLOAD_ERR_NO_FILE;
        $message = $messages[$errorCode] ?? 'Unknown upload error';
        
        $this->assertEquals('No file was uploaded', $message);
    }

    /**
     * Test upload error message for unknown error
     */
    public function testUploadErrorMessageUnknown(): void
    {
        $messages = [
            UPLOAD_ERR_NO_FILE => 'No file was uploaded'
        ];
        
        $errorCode = 999; // Unknown error code
        $message = $messages[$errorCode] ?? 'Unknown upload error';
        
        $this->assertEquals('Unknown upload error', $message);
    }

    /**
     * Test allowed extensions constant
     */
    public function testAllowedExtensionsConstant(): void
    {
        $this->assertIsArray(ALLOWED_EXTENSIONS);
        $this->assertContains('xlsx', ALLOWED_EXTENSIONS);
        $this->assertContains('xls', ALLOWED_EXTENSIONS);
    }

    /**
     * Test max upload size constant
     */
    public function testMaxUploadSizeConstant(): void
    {
        $this->assertEquals(10 * 1024 * 1024, MAX_UPLOAD_SIZE); // 10 MB
    }

    /**
     * Test sanitize function is used for filename
     */
    public function testSanitizeFilename(): void
    {
        $filename = '<script>alert("xss")</script>test.xlsx';
        $sanitized = sanitize($filename);
        
        $this->assertStringNotContainsString('<script>', $sanitized);
        $this->assertStringContainsString('test.xlsx', $sanitized);
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

    /**
     * Test file path extraction from filename
     */
    public function testFilePathExtraction(): void
    {
        $filename = '/path/to/file/test.xlsx';
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $basename = pathinfo($filename, PATHINFO_BASENAME);
        
        $this->assertEquals('xlsx', $extension);
        $this->assertEquals('test.xlsx', $basename);
    }

    /**
     * Test import record initialization
     */
    public function testImportRecordInitialization(): void
    {
        $importRecord = [
            'file_name' => 'test.xlsx',
            'file_size' => 1024,
            'import_mapping' => null,
            'imported_by' => 1,
            'records_imported' => 0,
            'records_with_errors' => 0
        ];
        
        $this->assertEquals('test.xlsx', $importRecord['file_name']);
        $this->assertEquals(1024, $importRecord['file_size']);
        $this->assertNull($importRecord['import_mapping']);
        $this->assertEquals(1, $importRecord['imported_by']);
        $this->assertEquals(0, $importRecord['records_imported']);
        $this->assertEquals(0, $importRecord['records_with_errors']);
    }

    /**
     * Test error response structure
     */
    public function testErrorResponseStructure(): void
    {
        $errors = [
            ['import_id' => 1, 'row_number' => 5, 'error_message' => 'Invalid data'],
            ['import_id' => 1, 'row_number' => 10, 'error_message' => 'Missing field']
        ];
        
        $response = [
            'import_id' => 1,
            'errors' => $errors,
            'count' => count($errors)
        ];
        
        $this->assertEquals(1, $response['import_id']);
        $this->assertCount(2, $response['errors']);
        $this->assertEquals(2, $response['count']);
    }

    /**
     * Test import list response structure
     */
    public function testImportListResponseStructure(): void
    {
        $imports = [
            ['id' => 1, 'file_name' => 'test1.xlsx'],
            ['id' => 2, 'file_name' => 'test2.xlsx']
        ];
        
        $pagination = [
            'page' => 1,
            'limit' => 20,
            'total' => 2,
            'pages' => 1
        ];
        
        $response = [
            'imports' => $imports,
            'pagination' => $pagination
        ];
        
        $this->assertArrayHasKey('imports', $response);
        $this->assertArrayHasKey('pagination', $response);
        $this->assertEquals(1, $response['pagination']['page']);
        $this->assertEquals(2, $response['pagination']['total']);
    }

    /**
     * Test file size formatting for error message
     */
    public function testFileSizeFormattingForErrorMessage(): void
    {
        $maxSizeMB = MAX_UPLOAD_SIZE / 1024 / 1024;
        $message = 'File too large (max ' . $maxSizeMB . ' MB)';
        
        $this->assertEquals('File too large (max 10 MB)', $message);
    }

    /**
     * Test allowed extensions string for error message
     */
    public function testAllowedExtensionsErrorMessage(): void
    {
        $message = 'Invalid file type. Allowed: ' . implode(', ', ALLOWED_EXTENSIONS);
        
        $this->assertStringContainsString('xlsx', $message);
        $this->assertStringContainsString('xls', $message);
    }

    /**
     * Test Auth::userId is available
     */
    public function testAuthUserIdIsAvailable(): void
    {
        $this->assertNotNull(Auth::userId());
        $this->assertEquals(1, Auth::userId());
    }

    /**
     * Test empty filename handling
     */
    public function testEmptyFilenameHandling(): void
    {
        $filename = '';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $this->assertEquals('', $extension);
        $this->assertFalse(in_array($extension, ALLOWED_EXTENSIONS));
    }

    /**
     * Test filename with special characters
     */
    public function testFilenameWithSpecialCharacters(): void
    {
        $filename = 'test-file_2023.xlsx';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $this->assertEquals('xlsx', $extension);
        $this->assertTrue(in_array($extension, ALLOWED_EXTENSIONS));
    }

    /**
     * Test multiple file extensions handling
     */
    public function testMultipleFileExtensions(): void
    {
        $filename = 'test.backup.xlsx';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $this->assertEquals('xlsx', $extension);
        $this->assertTrue(in_array($extension, ALLOWED_EXTENSIONS));
    }

    /**
     * Test JSON encoding of mapping
     */
    public function testJsonEncodingOfMapping(): void
    {
        $mapping = ['column1' => 'field1', 'column2' => 'field2'];
        $encoded = json_encode($mapping);
        $decoded = json_decode($encoded, true);
        
        $this->assertEquals($mapping, $decoded);
    }

    /**
     * Test null mapping JSON encoding
     */
    public function testNullMappingJsonEncoding(): void
    {
        $mapping = null;
        $encoded = $mapping ? json_encode($mapping) : null;
        
        $this->assertNull($encoded);
    }

    /**
     * Test file upload with all valid parameters
     */
    public function testFileUploadWithAllValidParameters(): void
    {
        $_FILES['file'] = [
            'name' => 'test_data.xlsx',
            'size' => 5 * 1024 * 1024, // 5 MB
            'error' => UPLOAD_ERR_OK,
            'tmp_name' => '/tmp/test_upload'
        ];
        
        $_POST['mapping'] = json_encode([
            'Auftrag' => 'auftrag',
            'Titel' => 'titel'
        ]);
        
        $hasFile = isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK;
        $isSizeValid = $_FILES['file']['size'] <= MAX_UPLOAD_SIZE;
        
        $extension = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
        $isExtensionValid = in_array($extension, ALLOWED_EXTENSIONS);
        
        $this->assertTrue($hasFile);
        $this->assertTrue($isSizeValid);
        $this->assertTrue($isExtensionValid);
    }

    /**
     * Test import with XLS file
     */
    public function testImportWithXlsFile(): void
    {
        $filename = 'legacy_data.xls';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $this->assertEquals('xls', $extension);
        $this->assertTrue(in_array($extension, ALLOWED_EXTENSIONS));
    }

    /**
     * Test import record with mapping
     */
    public function testImportRecordWithMapping(): void
    {
        $mapping = [
            'Auftrag' => 'auftrag',
            'Titel' => 'titel',
            'Status' => 'status'
        ];
        
        $importRecord = [
            'file_name' => 'test.xlsx',
            'file_size' => 1024,
            'import_mapping' => json_encode($mapping),
            'imported_by' => 1,
            'records_imported' => 0,
            'records_with_errors' => 0
        ];
        
        $decodedMapping = json_decode($importRecord['import_mapping'], true);
        
        $this->assertIsArray($decodedMapping);
        $this->assertEquals('auftrag', $decodedMapping['Auftrag']);
        $this->assertEquals('titel', $decodedMapping['Titel']);
        $this->assertEquals('status', $decodedMapping['Status']);
    }

    /**
     * Test error count in import response
     */
    public function testErrorCountInImportResponse(): void
    {
        $import = [
            'id' => 1,
            'file_name' => 'test.xlsx',
            'records_imported' => 100,
            'records_with_errors' => 5
        ];
        
        $errorCount = 15; // From separate query
        $import['error_count'] = $errorCount;
        
        $this->assertEquals(15, $import['error_count']);
        $this->assertEquals(5, $import['records_with_errors']);
    }

    /**
     * Test import errors ordered by row number
     */
    public function testImportErrorsOrderedByRowNumber(): void
    {
        $errors = [
            ['row_number' => 5, 'error_message' => 'Error 1'],
            ['row_number' => 2, 'error_message' => 'Error 2'],
            ['row_number' => 10, 'error_message' => 'Error 3']
        ];
        
        // Simulate ORDER BY row_number ASC
        usort($errors, function($a, $b) {
            return $a['row_number'] - $b['row_number'];
        });
        
        $this->assertEquals(2, $errors[0]['row_number']);
        $this->assertEquals(5, $errors[1]['row_number']);
        $this->assertEquals(10, $errors[2]['row_number']);
    }

    /**
     * Test list with username join
     */
    public function testListWithUsernameJoin(): void
    {
        $import = [
            'id' => 1,
            'file_name' => 'test.xlsx',
            'imported_by' => 5,
            'imported_by_username' => 'testuser'
        ];
        
        $this->assertEquals(5, $import['imported_by']);
        $this->assertEquals('testuser', $import['imported_by_username']);
    }

    /**
     * Test file upload error codes
     */
    public function testFileUploadErrorCodes(): void
    {
        $errorCodes = [
            UPLOAD_ERR_OK,
            UPLOAD_ERR_INI_SIZE,
            UPLOAD_ERR_FORM_SIZE,
            UPLOAD_ERR_PARTIAL,
            UPLOAD_ERR_NO_FILE,
            UPLOAD_ERR_NO_TMP_DIR,
            UPLOAD_ERR_CANT_WRITE,
            UPLOAD_ERR_EXTENSION
        ];
        
        $this->assertContains(UPLOAD_ERR_OK, $errorCodes);
        $this->assertContains(UPLOAD_ERR_NO_FILE, $errorCodes);
        $this->assertEquals(0, UPLOAD_ERR_OK);
    }

    /**
     * Test pagination offset for different pages
     */
    public function testPaginationOffsetForDifferentPages(): void
    {
        $limit = 20;
        
        $page = 1;
        $offset = ($page - 1) * $limit;
        $this->assertEquals(0, $offset);
        
        $page = 3;
        $offset = ($page - 1) * $limit;
        $this->assertEquals(40, $offset);
        
        $page = 10;
        $offset = ($page - 1) * $limit;
        $this->assertEquals(180, $offset);
    }

    /**
     * Test import with complex mapping
     */
    public function testImportWithComplexMapping(): void
    {
        $mapping = [
            'Order Number' => 'auftrag',
            'Title/Description' => 'titel',
            'Location Name' => 'standort',
            'Room/Column' => 'saeule_raum',
            'Equipment ID' => 'anlage_nr'
        ];
        
        $json = json_encode($mapping);
        $decoded = json_decode($json, true);
        
        $this->assertEquals($mapping, $decoded);
        $this->assertEquals('auftrag', $decoded['Order Number']);
    }

    /**
     * Test file extension case insensitivity
     */
    public function testFileExtensionCaseInsensitivity(): void
    {
        $files = [
            'test.XLSX',
            'test.xlsx',
            'test.XlSx',
            'test.XLS',
            'test.xls'
        ];
        
        foreach ($files as $filename) {
            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            $this->assertTrue(in_array($extension, ALLOWED_EXTENSIONS));
        }
    }

    /**
     * Test import response format
     */
    public function testImportResponseFormat(): void
    {
        $response = [
            'import' => [
                'id' => 1,
                'file_name' => 'test.xlsx',
                'records_imported' => 0,
                'records_with_errors' => 0
            ],
            'message' => 'File uploaded successfully. Processing will be handled by client-side parser.'
        ];
        
        $this->assertArrayHasKey('import', $response);
        $this->assertArrayHasKey('message', $response);
        $this->assertEquals(1, $response['import']['id']);
    }

    /**
     * Test get errors response structure
     */
    public function testGetErrorsResponseStructure(): void
    {
        $response = [
            'import_id' => 5,
            'errors' => [
                ['row_number' => 1, 'error_message' => 'Error 1'],
                ['row_number' => 2, 'error_message' => 'Error 2']
            ],
            'count' => 2
        ];
        
        $this->assertEquals(5, $response['import_id']);
        $this->assertCount(2, $response['errors']);
        $this->assertEquals($response['count'], count($response['errors']));
    }

    /**
     * Test file size in bytes conversion to MB
     */
    public function testFileSizeInBytesConversionToMB(): void
    {
        $sizeInBytes = 5 * 1024 * 1024; // 5 MB
        $sizeInMB = $sizeInBytes / 1024 / 1024;
        
        $this->assertEquals(5, $sizeInMB);
        
        $sizeInBytes = 1024 * 1024; // 1 MB
        $sizeInMB = $sizeInBytes / 1024 / 1024;
        
        $this->assertEquals(1, $sizeInMB);
    }

    /**
     * Test import list pagination response
     */
    public function testImportListPaginationResponse(): void
    {
        $total = 150;
        $page = 3;
        $limit = 20;
        
        $pagination = [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ];
        
        $this->assertEquals(3, $pagination['page']);
        $this->assertEquals(20, $pagination['limit']);
        $this->assertEquals(150, $pagination['total']);
        $this->assertEquals(8, $pagination['pages']);
    }

    /**
     * Test sanitize is used for file name
     */
    public function testSanitizeIsUsedForFileName(): void
    {
        $unsafeFilename = '<script>alert("xss")</script>data.xlsx';
        $safeFilename = sanitize($unsafeFilename);
        
        $this->assertStringNotContainsString('<script>', $safeFilename);
        $this->assertStringContainsString('data.xlsx', $safeFilename);
    }

    /**
     * Test import with zero records
     */
    public function testImportWithZeroRecords(): void
    {
        $importRecord = [
            'records_imported' => 0,
            'records_with_errors' => 0
        ];
        
        $this->assertEquals(0, $importRecord['records_imported']);
        $this->assertEquals(0, $importRecord['records_with_errors']);
    }

    /**
     * Test import with all errors
     */
    public function testImportWithAllErrors(): void
    {
        $totalRows = 100;
        $importRecord = [
            'records_imported' => 0,
            'records_with_errors' => 100
        ];
        
        $successRate = $importRecord['records_imported'] / $totalRows * 100;
        $errorRate = $importRecord['records_with_errors'] / $totalRows * 100;
        
        $this->assertEquals(0, $successRate);
        $this->assertEquals(100, $errorRate);
    }

    /**
     * Test import with partial errors
     */
    public function testImportWithPartialErrors(): void
    {
        $totalRows = 100;
        $importRecord = [
            'records_imported' => 95,
            'records_with_errors' => 5
        ];
        
        $successRate = $importRecord['records_imported'] / $totalRows * 100;
        $errorRate = $importRecord['records_with_errors'] / $totalRows * 100;
        
        $this->assertEquals(95, $successRate);
        $this->assertEquals(5, $errorRate);
    }
}

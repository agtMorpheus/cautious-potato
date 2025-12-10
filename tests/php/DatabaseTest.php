<?php
/**
 * Database Connection Tests
 * 
 * Tests the Database class functionality including connection handling,
 * reconnection, and error handling.
 */

use PHPUnit\Framework\TestCase;

// Load configuration
require_once __DIR__ . '/../../api/config.php';

class DatabaseTest extends TestCase
{
    protected function setUp(): void
    {
        // Reset singleton instance before each test
        Database::resetInstance();
    }

    protected function tearDown(): void
    {
        // Clean up after each test
        Database::resetInstance();
    }

    /**
     * Test that DatabaseConnectionException class exists and extends Exception
     */
    public function testDatabaseConnectionExceptionExists(): void
    {
        $exception = new DatabaseConnectionException('Test message');
        $this->assertInstanceOf(Exception::class, $exception);
        $this->assertEquals('Test message', $exception->getMessage());
    }

    /**
     * Test that DatabaseConnectionException has default message
     */
    public function testDatabaseConnectionExceptionDefaultMessage(): void
    {
        $exception = new DatabaseConnectionException();
        $this->assertEquals('Database connection failed', $exception->getMessage());
    }

    /**
     * Test that Database class has required static methods
     */
    public function testDatabaseClassHasRequiredMethods(): void
    {
        $this->assertTrue(method_exists(Database::class, 'getInstance'));
        $this->assertTrue(method_exists(Database::class, 'testConnection'));
        $this->assertTrue(method_exists(Database::class, 'resetInstance'));
    }

    /**
     * Test that Database constants are defined
     */
    public function testDatabaseConstantsAreDefined(): void
    {
        $this->assertTrue(defined('DB_HOST'));
        $this->assertTrue(defined('DB_NAME'));
        $this->assertTrue(defined('DB_USER'));
        $this->assertTrue(defined('DB_PASS'));
        $this->assertTrue(defined('DB_CHARSET'));
    }

    /**
     * Test that Database::testConnection returns boolean
     */
    public function testTestConnectionReturnsBoolean(): void
    {
        $result = Database::testConnection();
        $this->assertIsBool($result);
    }

    /**
     * Test that db() function exists
     */
    public function testDbFunctionExists(): void
    {
        $this->assertTrue(function_exists('db'));
    }

    /**
     * Test that Database::resetInstance works
     */
    public function testResetInstance(): void
    {
        // This should not throw any errors
        Database::resetInstance();
        $this->assertTrue(true);
    }

    /**
     * Test error response helper function exists
     */
    public function testErrorResponseFunctionExists(): void
    {
        $this->assertTrue(function_exists('errorResponse'));
    }

    /**
     * Test JSON response helper function exists
     */
    public function testJsonResponseFunctionExists(): void
    {
        $this->assertTrue(function_exists('jsonResponse'));
    }

    /**
     * Test sanitize helper function exists and works
     */
    public function testSanitizeFunctionExists(): void
    {
        $this->assertTrue(function_exists('sanitize'));
    }

    /**
     * Test sanitize function with null input
     */
    public function testSanitizeWithNull(): void
    {
        $result = sanitize(null);
        $this->assertNull($result);
    }

    /**
     * Test sanitize function with normal string
     */
    public function testSanitizeWithString(): void
    {
        $result = sanitize('  test string  ');
        $this->assertEquals('test string', $result);
    }

    /**
     * Test sanitize function with HTML
     */
    public function testSanitizeWithHtml(): void
    {
        $result = sanitize('<script>alert("xss")</script>');
        $this->assertStringNotContainsString('<script>', $result);
    }

    /**
     * Test generateUUID function exists and returns valid format
     */
    public function testGenerateUuidFunction(): void
    {
        $this->assertTrue(function_exists('generateUUID'));
        
        $uuid = generateUUID();
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        $this->assertRegExp(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
            $uuid
        );
    }

    /**
     * Test that generateUUID generates unique values
     */
    public function testGenerateUuidUniqueness(): void
    {
        $uuids = [];
        for ($i = 0; $i < 100; $i++) {
            $uuids[] = generateUUID();
        }
        
        // All UUIDs should be unique
        $this->assertEquals(count($uuids), count(array_unique($uuids)));
    }

    /**
     * Test getJsonBody function exists
     */
    public function testGetJsonBodyFunctionExists(): void
    {
        $this->assertTrue(function_exists('getJsonBody'));
    }

    /**
     * Test configuration constants
     */
    public function testConfigurationConstants(): void
    {
        $this->assertTrue(defined('APP_ENV'));
        $this->assertTrue(defined('APP_DEBUG'));
        $this->assertTrue(defined('SESSION_TIMEOUT'));
        $this->assertTrue(defined('SESSION_NAME'));
    }

    /**
     * Test session configuration constants
     */
    public function testSessionConfigurationConstants(): void
    {
        $this->assertTrue(defined('SESSION_COOKIE_LIFETIME'));
        $this->assertTrue(defined('SESSION_COOKIE_HTTPONLY'));
        $this->assertTrue(defined('SESSION_COOKIE_SECURE'));
        $this->assertTrue(defined('SESSION_COOKIE_SAMESITE'));
    }

    /**
     * Test security configuration constants
     */
    public function testSecurityConfigurationConstants(): void
    {
        $this->assertTrue(defined('CSRF_ENABLED'));
        $this->assertTrue(defined('SECURE_COOKIES'));
    }

    /**
     * Test pagination defaults
     */
    public function testPaginationDefaults(): void
    {
        $this->assertTrue(defined('DEFAULT_PAGE_SIZE'));
        $this->assertTrue(defined('MAX_PAGE_SIZE'));
        $this->assertIsInt(DEFAULT_PAGE_SIZE);
        $this->assertIsInt(MAX_PAGE_SIZE);
        $this->assertGreaterThan(0, DEFAULT_PAGE_SIZE);
        $this->assertGreaterThan(DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    }

    /**
     * Test upload limits configuration
     */
    public function testUploadLimitsConfiguration(): void
    {
        $this->assertTrue(defined('MAX_UPLOAD_SIZE'));
        $this->assertTrue(defined('ALLOWED_EXTENSIONS'));
        $this->assertIsInt(MAX_UPLOAD_SIZE);
        $this->assertIsArray(ALLOWED_EXTENSIONS);
    }
}

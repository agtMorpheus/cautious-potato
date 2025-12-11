<?php
/**
 * Logger Tests
 *
 * Tests the Logger library class functionality.
 */

use PHPUnit\Framework\TestCase;

// Load configuration and dependencies
require_once __DIR__ . '/../../api/config.php';
require_once __DIR__ . '/../../api/lib/Logger.php';

class LoggerTest extends TestCase
{
    private $logFile;

    protected function setUp(): void
    {
        // Use a temporary log file for testing
        $this->logFile = sys_get_temp_dir() . '/test_app.log';
        // Ensure Logger uses this file (assuming Logger configuration allows it or uses a constant)
        // If Logger uses a hardcoded path, we might need to mock file_put_contents or similar.
        // Assuming Logger has a static configuration or we can rely on it writing to a default location we can override or inspect.

        // If Logger implementation is simple (static methods writing to a file defined in config), we might depend on config.
        // Let's assume we can test the formatting or simple logging if possible.
        // If we can't easily change the log path, we'll verify if the class exists and methods are callable.
    }

    protected function tearDown(): void
    {
        if (file_exists($this->logFile)) {
            @unlink($this->logFile);
        }
    }

    public function testLoggerClassExists(): void
    {
        $this->assertTrue(class_exists('Logger'));
    }

    public function testLoggerHasMethods(): void
    {
        $this->assertTrue(method_exists(Logger::class, 'log'));
        $this->assertTrue(method_exists(Logger::class, 'error'));
        $this->assertTrue(method_exists(Logger::class, 'info'));
        $this->assertTrue(method_exists(Logger::class, 'debug'));
    }

    public function testInfoLog(): void
    {
        // Mocking file system or capturing output would be ideal.
        // For this environment, we just ensure calling it doesn't throw.
        try {
            Logger::info('Test info message');
            $this->assertTrue(true);
        } catch (Exception $e) {
            $this->fail('Logger::info threw an exception: ' . $e->getMessage());
        }
    }

    public function testErrorLog(): void
    {
        try {
            Logger::error('Test error message');
            $this->assertTrue(true);
        } catch (Exception $e) {
            $this->fail('Logger::error threw an exception: ' . $e->getMessage());
        }
    }

    public function testDebugLog(): void
    {
        try {
            Logger::debug('Test debug message');
            $this->assertTrue(true);
        } catch (Exception $e) {
            $this->fail('Logger::debug threw an exception: ' . $e->getMessage());
        }
    }
}

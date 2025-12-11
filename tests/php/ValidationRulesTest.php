<?php
/**
 * Validation Rules Tests
 *
 * Tests the ValidationRules engine.
 */

use PHPUnit\Framework\TestCase;

// Load configuration and dependencies
require_once __DIR__ . '/../../api/config.php';
require_once __DIR__ . '/../../api/lib/Logger.php';
require_once __DIR__ . '/../../api/lib/ValidationRules.php';

class ValidationRulesTest extends TestCase
{
    protected function setUp(): void
    {
        // Reset database singleton
        Database::resetInstance();

        // Capture output
        ob_start();
    }

    protected function tearDown(): void
    {
        // Clear output buffer
        ob_end_clean();

        // Clean up
        Database::resetInstance();
    }

    public function testValidateStringField()
    {
        $data = ['titel' => 'Valid Title'];
        $result = ValidationRules::validate($data);
        $this->assertTrue($result['valid']);
    }

    public function testValidateRequiredFieldMissing()
    {
        $data = ['titel' => ''];
        $result = ValidationRules::validate($data);
        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('titel', $result['errors']);
    }

    public function testValidateEmailFormat()
    {
        // Add a mock rule for email if not default
        // Assuming default rules don't cover email, but let's test pattern matching via addRule mock if possible.
        // ValidationRules::addRule uses DB, so we'd need to mock DB.
        // But we can test default rules for 'auftrag' (alphanumeric)

        $data = ['auftrag' => 'INV-001', 'titel' => 'Title'];
        $result = ValidationRules::validate($data);
        $this->assertTrue($result['valid']);

        $data = ['auftrag' => 'INV$001', 'titel' => 'Title']; // Invalid char $
        $result = ValidationRules::validate($data);
        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('auftrag', $result['errors']);
    }

    public function testValidateEnumField()
    {
        $data = ['status' => 'offen', 'auftrag' => 'A1', 'titel' => 'T1'];
        $result = ValidationRules::validate($data);
        $this->assertTrue($result['valid']);

        $data = ['status' => 'invalid_status', 'auftrag' => 'A1', 'titel' => 'T1'];
        $result = ValidationRules::validate($data);
        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('status', $result['errors']);
    }

    public function testValidateDateField()
    {
        $data = ['sollstart' => '2023-01-01', 'auftrag' => 'A1', 'titel' => 'T1', 'status' => 'offen'];
        $result = ValidationRules::validate($data);
        $this->assertTrue($result['valid']);

        $data = ['sollstart' => 'invalid-date', 'auftrag' => 'A1', 'titel' => 'T1', 'status' => 'offen'];
        $result = ValidationRules::validate($data);
        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('sollstart', $result['errors']);
    }

    public function testValidateDateRange()
    {
        // Min date is -365 days
        $tooOld = date('Y-m-d', strtotime('-400 days'));
        $data = ['sollstart' => $tooOld, 'auftrag' => 'A1', 'titel' => 'T1', 'status' => 'offen'];
        $result = ValidationRules::validate($data);
        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('sollstart', $result['errors']);
    }

    public function testFlattenErrors()
    {
        $result = [
            'valid' => false,
            'errors' => [
                'field1' => ['Error 1'],
                'field2' => ['Error 2', 'Error 3']
            ]
        ];

        $flattened = ValidationRules::flattenErrors($result);
        $this->assertCount(3, $flattened);
        $this->assertContains('Error 1', $flattened);
        $this->assertContains('Error 3', $flattened);
    }
}

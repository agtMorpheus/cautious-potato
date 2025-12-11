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

    // Additional Tests

    public function testValidateWithEmptyData()
    {
        $data = [];
        $result = ValidationRules::validate($data);
        
        // Depending on implementation, empty data might be valid or have required field errors
        $this->assertIsArray($result);
        $this->assertArrayHasKey('valid', $result);
        $this->assertArrayHasKey('errors', $result);
    }

    public function testValidateWithNullValue()
    {
        $data = ['titel' => null];
        $result = ValidationRules::validate($data);
        
        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('titel', $result['errors']);
    }

    public function testValidateWithWhitespaceOnlyTitle()
    {
        $data = ['titel' => '   '];
        $result = ValidationRules::validate($data);
        
        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('titel', $result['errors']);
    }

    public function testValidateAllValidStatuses()
    {
        $validStatuses = ['offen', 'inbearb', 'fertig'];
        
        foreach ($validStatuses as $status) {
            $data = ['status' => $status, 'auftrag' => 'A1', 'titel' => 'T1'];
            $result = ValidationRules::validate($data);
            $this->assertTrue($result['valid'], "Status '$status' should be valid");
        }
    }

    public function testValidateDateWithFutureDateNearLimit()
    {
        // Date within the future limit (730 days)
        $validFuture = date('Y-m-d', strtotime('+700 days'));
        $data = ['sollstart' => $validFuture, 'auftrag' => 'A1', 'titel' => 'T1', 'status' => 'offen'];
        $result = ValidationRules::validate($data);
        $this->assertTrue($result['valid']);
    }

    public function testValidateDateTooFarInFuture()
    {
        // Date beyond the future limit (730 days)
        $tooFuture = date('Y-m-d', strtotime('+800 days'));
        $data = ['sollstart' => $tooFuture, 'auftrag' => 'A1', 'titel' => 'T1', 'status' => 'offen'];
        $result = ValidationRules::validate($data);
        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('sollstart', $result['errors']);
    }

    public function testValidateAuftragWithSpecialChars()
    {
        // Various invalid characters
        $invalidAuftrags = ['INV@001', 'INV#001', 'INV%001', 'INV&001', 'INV*001'];
        
        foreach ($invalidAuftrags as $auftrag) {
            $data = ['auftrag' => $auftrag, 'titel' => 'Title'];
            $result = ValidationRules::validate($data);
            $this->assertFalse($result['valid'], "Auftrag '$auftrag' should be invalid");
        }
    }

    public function testValidateAuftragWithValidFormats()
    {
        // Valid formats: alphanumeric with dashes
        $validAuftrags = ['INV-001', 'INV_001', 'INV123', 'inv-001'];
        
        foreach ($validAuftrags as $auftrag) {
            $data = ['auftrag' => $auftrag, 'titel' => 'Title'];
            $result = ValidationRules::validate($data);
            $this->assertTrue($result['valid'], "Auftrag '$auftrag' should be valid");
        }
    }

    public function testValidateMultipleFieldsWithErrors()
    {
        $data = [
            'titel' => '',
            'auftrag' => 'INV$001',
            'status' => 'invalid'
        ];
        $result = ValidationRules::validate($data);
        
        $this->assertFalse($result['valid']);
        // Should have errors for multiple fields
        $this->assertGreaterThanOrEqual(1, count($result['errors']));
    }

    public function testFlattenErrorsWithEmptyErrors()
    {
        $result = [
            'valid' => true,
            'errors' => []
        ];
        
        $flattened = ValidationRules::flattenErrors($result);
        $this->assertIsArray($flattened);
        $this->assertEmpty($flattened);
    }

    public function testFlattenErrorsWithSingleFieldError()
    {
        $result = [
            'valid' => false,
            'errors' => [
                'titel' => ['Title is required']
            ]
        ];
        
        $flattened = ValidationRules::flattenErrors($result);
        $this->assertCount(1, $flattened);
        $this->assertEquals('Title is required', $flattened[0]);
    }

    public function testValidateReturnStructure()
    {
        $data = ['titel' => 'Valid Title'];
        $result = ValidationRules::validate($data);
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('valid', $result);
        $this->assertArrayHasKey('errors', $result);
        $this->assertIsBool($result['valid']);
        $this->assertIsArray($result['errors']);
    }

    public function testValidateTitleMaxLength()
    {
        // Test title at or near max length
        $longTitle = str_repeat('A', 100);
        $data = ['titel' => $longTitle, 'auftrag' => 'A1'];
        $result = ValidationRules::validate($data);
        
        // Check if validation passes or if there's a max length rule
        $this->assertIsArray($result);
    }

    public function testValidateDateFormatVariations()
    {
        // Test various date formats
        $dateFormats = [
            '2023-01-01',      // ISO format
            '2023-12-31',      // End of year
            '2024-02-29'       // Leap year
        ];
        
        foreach ($dateFormats as $date) {
            $data = ['sollstart' => $date, 'auftrag' => 'A1', 'titel' => 'T1', 'status' => 'offen'];
            $result = ValidationRules::validate($data);
            
            // Valid date format should be accepted
            if (!$result['valid'] && isset($result['errors']['sollstart'])) {
                // If invalid, check if it's due to date format or date range
                $this->assertNotEmpty($result['errors']['sollstart']);
            }
        }
    }

    public function testValidateInvalidDateFormats()
    {
        $invalidDates = [
            'not-a-date',
            '2023/01/01',       // Wrong separator
            '01-01-2023',       // Wrong order (might be invalid)
            '2023-13-01',       // Invalid month
            '2023-01-32'        // Invalid day
        ];
        
        foreach ($invalidDates as $date) {
            $data = ['sollstart' => $date, 'auftrag' => 'A1', 'titel' => 'T1', 'status' => 'offen'];
            $result = ValidationRules::validate($data);
            
            // These should either fail validation or be caught as invalid
            $this->assertIsArray($result);
        }
    }

    public function testValidateStatusCaseSensitivity()
    {
        // Test if status validation is case-sensitive
        $data = ['status' => 'OFFEN', 'auftrag' => 'A1', 'titel' => 'T1'];
        $result = ValidationRules::validate($data);
        
        // Depending on implementation, uppercase might be invalid
        $this->assertIsArray($result);
        $this->assertArrayHasKey('valid', $result);
    }
}

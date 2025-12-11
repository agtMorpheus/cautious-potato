<?php
/**
 * Duplicate Detector Tests
 *
 * Tests the DuplicateDetector engine.
 */

use PHPUnit\Framework\TestCase;

// Load configuration and dependencies
require_once __DIR__ . '/../../api/config.php';
require_once __DIR__ . '/../../api/lib/Logger.php';
require_once __DIR__ . '/../../api/lib/DuplicateDetector.php';

class DuplicateDetectorTest extends TestCase
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

    /**
     * Test exact match similarity
     */
    public function testExactMatchSimilarity()
    {
        $c1 = [
            'titel' => 'Wartung 2023',
            'anlage_nr' => 'A123',
            'standort' => 'Berlin',
            'saeule_raum' => 'R1',
            'auftrag' => 'JOB-001',
            'created_at' => '2023-01-01 12:00:00'
        ];

        // c2 is identical
        $c2 = $c1;

        $result = DuplicateDetector::calculateSimilarity($c1, $c2);

        // Should be 1.0 (or very close)
        $this->assertEquals(1.0, $result['score']);
        $this->assertContains('Same equipment ID', $result['reasons']);
        $this->assertContains('Same location and room', $result['reasons']);
    }

    /**
     * Test completely different contracts
     */
    public function testDifferentContractsSimilarity()
    {
        $c1 = [
            'titel' => 'Wartung A',
            'anlage_nr' => 'A1',
            'standort' => 'Berlin',
            'saeule_raum' => 'R1',
            'auftrag' => 'JOB-A',
            'created_at' => '2023-01-01'
        ];

        $c2 = [
            'titel' => 'Reparatur B',
            'anlage_nr' => 'B2',
            'standort' => 'Munich',
            'saeule_raum' => 'R2',
            'auftrag' => 'JOB-B',
            'created_at' => '2023-06-01'
        ];

        $result = DuplicateDetector::calculateSimilarity($c1, $c2);

        // Should be very low
        $this->assertLessThan(0.3, $result['score']);
        $this->assertEmpty($result['reasons']);
    }

    /**
     * Test title similarity
     */
    public function testTitleSimilarity()
    {
        $c1 = ['titel' => 'Wartung Feuerlöscher'];
        $c2 = ['titel' => 'Wartung Feuerloescher']; // Similar

        $result = DuplicateDetector::calculateSimilarity($c1, $c2);

        $this->assertGreaterThan(0.8, $result['field_scores']['titel']);
    }

    /**
     * Test date proximity
     */
    public function testDateProximity()
    {
        $c1 = ['created_at' => '2023-01-01 10:00:00'];
        $c2 = ['created_at' => '2023-01-01 15:00:00']; // Same day

        $result = DuplicateDetector::calculateSimilarity($c1, $c2);

        $this->assertEquals(1.0, $result['field_scores']['date_proximity']);
        $this->assertContains('Created on same day', $result['reasons']);

        // 5 days apart
        $c3 = ['created_at' => '2023-01-06 10:00:00'];
        $result = DuplicateDetector::calculateSimilarity($c1, $c3);
        $this->assertGreaterThan(0, $result['field_scores']['date_proximity']);
        $this->assertLessThan(1.0, $result['field_scores']['date_proximity']);
    }

    /**
     * Test partial fields match
     */
    public function testPartialFieldsMatch()
    {
        $c1 = [
            'titel' => 'Wartung',
            'anlage_nr' => 'A123', // Match (0.25)
            'standort' => 'Berlin' // Match (0.20)
        ];

        $c2 = [
            'titel' => 'Reparatur',
            'anlage_nr' => 'A123',
            'standort' => 'Berlin'
        ];

        $result = DuplicateDetector::calculateSimilarity($c1, $c2);

        // Score should be roughly 0.25 + 0.20 = 0.45 (ignoring title diff)
        $this->assertGreaterThan(0.4, $result['score']);
    }

    /**
     * Test case insensitivity
     */
    public function testCaseInsensitivity()
    {
        $c1 = ['standort' => 'BERLIN'];
        $c2 = ['standort' => 'Berlin'];

        $result = DuplicateDetector::calculateSimilarity($c1, $c2);

        $this->assertEquals(1.0, $result['field_scores']['standort']);
    }
}

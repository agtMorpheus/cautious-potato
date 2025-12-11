<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/lib/WorkflowEngine.php';
// Logger might be needed if included by WorkflowEngine
if (file_exists(__DIR__ . '/../../api/lib/Logger.php')) {
    require_once __DIR__ . '/../../api/lib/Logger.php';
} else {
    // Mock Logger if not present
    class Logger {
        public static function info($msg, $ctx = []) {}
    }
}

class WorkflowEngineTest extends TestCase {

    public function testGetStatusLabels() {
        $labels = WorkflowEngine::getStatusLabels();
        $this->assertIsArray($labels);
        $this->assertArrayHasKey('offen', $labels);
        $this->assertEquals('Open', $labels['offen']);
    }

    public function testGetAllowedTransitions() {
        $transitions = WorkflowEngine::getAllowedTransitions('offen');
        $this->assertIsArray($transitions);
        $this->assertContains('inbearb', $transitions);

        $transitions = WorkflowEngine::getAllowedTransitions('fertig');
        $this->assertContains('inbearb', $transitions);

        $transitions = WorkflowEngine::getAllowedTransitions('unknown');
        $this->assertEmpty($transitions);
    }

    public function testIsValidTransition() {
        $this->assertTrue(WorkflowEngine::isValidTransition('offen', 'inbearb'), 'offen -> inbearb should be valid');
        $this->assertTrue(WorkflowEngine::isValidTransition('inbearb', 'fertig'), 'inbearb -> fertig should be valid');
        $this->assertTrue(WorkflowEngine::isValidTransition('inbearb', 'offen'), 'inbearb -> offen should be valid');

        $this->assertFalse(WorkflowEngine::isValidTransition('offen', 'fertig'), 'offen -> fertig should NOT be valid (must go via inbearb)');
        $this->assertFalse(WorkflowEngine::isValidTransition('fertig', 'offen'), 'fertig -> offen should NOT be valid');
    }
}

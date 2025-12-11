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

    public function testGetStatusLabelsContainsAllStatuses() {
        $labels = WorkflowEngine::getStatusLabels();
        
        $this->assertArrayHasKey('offen', $labels);
        $this->assertArrayHasKey('inbearb', $labels);
        $this->assertArrayHasKey('fertig', $labels);
        
        $this->assertEquals('Open', $labels['offen']);
        $this->assertEquals('In Progress', $labels['inbearb']);
        $this->assertEquals('Completed', $labels['fertig']);
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

    public function testGetAllowedTransitionsFromOffen() {
        $transitions = WorkflowEngine::getAllowedTransitions('offen');
        
        $this->assertContains('inbearb', $transitions);
        $this->assertNotContains('fertig', $transitions);
        $this->assertNotContains('offen', $transitions);
    }

    public function testGetAllowedTransitionsFromInbearb() {
        $transitions = WorkflowEngine::getAllowedTransitions('inbearb');
        
        $this->assertContains('offen', $transitions);
        $this->assertContains('fertig', $transitions);
        $this->assertNotContains('inbearb', $transitions);
    }

    public function testGetAllowedTransitionsFromFertig() {
        $transitions = WorkflowEngine::getAllowedTransitions('fertig');
        
        $this->assertContains('inbearb', $transitions);
        $this->assertNotContains('offen', $transitions);
        $this->assertNotContains('fertig', $transitions);
    }

    public function testGetAllowedTransitionsForUnknownStatus() {
        $transitions = WorkflowEngine::getAllowedTransitions('unknown_status');
        $this->assertIsArray($transitions);
        $this->assertEmpty($transitions);
    }

    public function testGetAllowedTransitionsForNullStatus() {
        $transitions = WorkflowEngine::getAllowedTransitions(null);
        $this->assertIsArray($transitions);
        $this->assertEmpty($transitions);
    }

    public function testGetAllowedTransitionsForEmptyString() {
        $transitions = WorkflowEngine::getAllowedTransitions('');
        $this->assertIsArray($transitions);
        $this->assertEmpty($transitions);
    }

    public function testIsValidTransition() {
        $this->assertTrue(WorkflowEngine::isValidTransition('offen', 'inbearb'), 'offen -> inbearb should be valid');
        $this->assertTrue(WorkflowEngine::isValidTransition('inbearb', 'fertig'), 'inbearb -> fertig should be valid');
        $this->assertTrue(WorkflowEngine::isValidTransition('inbearb', 'offen'), 'inbearb -> offen should be valid');

        $this->assertFalse(WorkflowEngine::isValidTransition('offen', 'fertig'), 'offen -> fertig should NOT be valid (must go via inbearb)');
        $this->assertFalse(WorkflowEngine::isValidTransition('fertig', 'offen'), 'fertig -> offen should NOT be valid');
    }

    public function testIsValidTransitionForReopeningCompleted() {
        $this->assertTrue(
            WorkflowEngine::isValidTransition('fertig', 'inbearb'),
            'fertig -> inbearb should be valid (reopen completed)'
        );
    }

    public function testIsValidTransitionForInvalidFromStatus() {
        $this->assertFalse(
            WorkflowEngine::isValidTransition('unknown', 'offen'),
            'unknown -> offen should NOT be valid'
        );
    }

    public function testIsValidTransitionForSameStatus() {
        $this->assertFalse(
            WorkflowEngine::isValidTransition('offen', 'offen'),
            'offen -> offen should NOT be valid (no self-transition)'
        );
        
        $this->assertFalse(
            WorkflowEngine::isValidTransition('inbearb', 'inbearb'),
            'inbearb -> inbearb should NOT be valid (no self-transition)'
        );
        
        $this->assertFalse(
            WorkflowEngine::isValidTransition('fertig', 'fertig'),
            'fertig -> fertig should NOT be valid (no self-transition)'
        );
    }

    public function testIsValidTransitionWithNullValues() {
        $this->assertFalse(WorkflowEngine::isValidTransition(null, 'inbearb'));
        $this->assertFalse(WorkflowEngine::isValidTransition('offen', null));
        $this->assertFalse(WorkflowEngine::isValidTransition(null, null));
    }

    public function testIsValidTransitionWithEmptyStrings() {
        $this->assertFalse(WorkflowEngine::isValidTransition('', 'inbearb'));
        $this->assertFalse(WorkflowEngine::isValidTransition('offen', ''));
        $this->assertFalse(WorkflowEngine::isValidTransition('', ''));
    }

    public function testIsValidTransitionCaseSensitivity() {
        // Workflow engine should be case-sensitive for status values
        $this->assertFalse(
            WorkflowEngine::isValidTransition('Offen', 'inbearb'),
            'Offen (capitalized) should NOT match offen'
        );
        
        $this->assertFalse(
            WorkflowEngine::isValidTransition('OFFEN', 'INBEARB'),
            'OFFEN (uppercase) should NOT match offen'
        );
    }

    public function testStatusLabelsCount() {
        $labels = WorkflowEngine::getStatusLabels();
        $this->assertCount(3, $labels, 'Should have exactly 3 status labels');
    }

    public function testTransitionPathFromOffenToFertig() {
        // Verify the correct path: offen -> inbearb -> fertig
        $this->assertTrue(WorkflowEngine::isValidTransition('offen', 'inbearb'));
        $this->assertTrue(WorkflowEngine::isValidTransition('inbearb', 'fertig'));
        
        // Direct path should not be valid
        $this->assertFalse(WorkflowEngine::isValidTransition('offen', 'fertig'));
    }

    public function testTransitionPathBackFromFertig() {
        // Verify the path back: fertig -> inbearb -> offen
        $this->assertTrue(WorkflowEngine::isValidTransition('fertig', 'inbearb'));
        $this->assertTrue(WorkflowEngine::isValidTransition('inbearb', 'offen'));
        
        // Direct path should not be valid
        $this->assertFalse(WorkflowEngine::isValidTransition('fertig', 'offen'));
    }

    public function testAllTransitionsAreBidirectionalOrNot() {
        // offen -> inbearb is valid but inbearb -> offen is also valid (bidirectional)
        $this->assertTrue(WorkflowEngine::isValidTransition('offen', 'inbearb'));
        $this->assertTrue(WorkflowEngine::isValidTransition('inbearb', 'offen'));
        
        // inbearb -> fertig is valid
        $this->assertTrue(WorkflowEngine::isValidTransition('inbearb', 'fertig'));
        // fertig -> inbearb is also valid (can reopen)
        $this->assertTrue(WorkflowEngine::isValidTransition('fertig', 'inbearb'));
    }

    public function testStatusLabelValuesAreStrings() {
        $labels = WorkflowEngine::getStatusLabels();
        
        foreach ($labels as $key => $label) {
            $this->assertIsString($key, "Status key should be a string");
            $this->assertIsString($label, "Status label should be a string");
            $this->assertNotEmpty($label, "Status label should not be empty");
        }
    }

    public function testAllowedTransitionsAreArrays() {
        $statuses = ['offen', 'inbearb', 'fertig'];
        
        foreach ($statuses as $status) {
            $transitions = WorkflowEngine::getAllowedTransitions($status);
            $this->assertIsArray($transitions, "Transitions for {$status} should be an array");
        }
    }

    public function testAllTransitionTargetsAreValidStatuses() {
        $statuses = ['offen', 'inbearb', 'fertig'];
        $validStatuses = array_keys(WorkflowEngine::getStatusLabels());
        
        foreach ($statuses as $status) {
            $transitions = WorkflowEngine::getAllowedTransitions($status);
            foreach ($transitions as $target) {
                $this->assertContains(
                    $target, 
                    $validStatuses, 
                    "Transition target '{$target}' from '{$status}' should be a valid status"
                );
            }
        }
    }
}

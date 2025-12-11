<?php

use PHPUnit\Framework\TestCase;

// Adjust paths based on location of tests/php/
require_once __DIR__ . '/../../api/lib/Cache.php';
// Logger might be needed if Cache uses it
if (file_exists(__DIR__ . '/../../api/lib/Logger.php')) {
    require_once __DIR__ . '/../../api/lib/Logger.php';
} else {
    // Mock Logger if not present
    class Logger {
        public static function warning($msg, $ctx = []) {}
    }
}

class CacheTest extends TestCase {

    public function setUp(): void {
        // Ensure cache is flushed before tests
        // Note: This might affect actual cache if running against real redis/files
        // Ideally should use a test prefix or directory
        Cache::flush();
    }

    public function tearDown(): void {
        Cache::flush();
    }

    public function testSetAndGet() {
        $key = 'test_key';
        $value = ['foo' => 'bar'];

        $result = Cache::set($key, $value);
        $this->assertTrue($result, 'Cache::set returned false');

        $retrieved = Cache::get($key);
        $this->assertEquals($value, $retrieved);
    }

    public function testGetNonExistent() {
        $this->assertNull(Cache::get('non_existent'));
    }

    public function testDelete() {
        Cache::set('to_delete', 'value');
        $this->assertTrue(Cache::has('to_delete'));

        Cache::delete('to_delete');
        $this->assertFalse(Cache::has('to_delete'));
    }

    public function testRemember() {
        $key = 'remember_test';
        $called = false;

        $callback = function() use (&$called) {
            $called = true;
            return 'computed';
        };

        // First call: should execute callback
        $val1 = Cache::remember($key, $callback);
        $this->assertEquals('computed', $val1);
        $this->assertTrue($called);

        // Second call: should use cache
        $called = false;
        $val2 = Cache::remember($key, $callback);
        $this->assertEquals('computed', $val2);
        $this->assertFalse($called);
    }

    public function testIncrement() {
        $key = 'counter';
        Cache::delete($key); // Ensure empty

        $val = Cache::increment($key);
        $this->assertEquals(1, $val);

        $val = Cache::increment($key, 2);
        $this->assertEquals(3, $val);

        $retrieved = Cache::get($key);
        $this->assertEquals(3, $retrieved);
    }

    public function testFlush() {
        Cache::set('k1', 'v1');
        Cache::set('k2', 'v2');

        Cache::flush();

        $this->assertNull(Cache::get('k1'));
        $this->assertNull(Cache::get('k2'));
    }
}

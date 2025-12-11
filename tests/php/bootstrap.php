<?php
/**
 * PHPUnit Bootstrap File
 * 
 * Sets up the test environment for PHP unit tests.
 */

// Load Composer autoloader
require_once __DIR__ . '/../../vendor/autoload.php';

// Set error reporting for tests
error_reporting(E_ALL);

// Mock superglobals that might not be available in CLI
if (!isset($_SERVER['REMOTE_ADDR'])) {
    $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
}
if (!isset($_SERVER['HTTP_USER_AGENT'])) {
    $_SERVER['HTTP_USER_AGENT'] = 'PHPUnit Test';
}
if (!isset($_SERVER['REQUEST_METHOD'])) {
    $_SERVER['REQUEST_METHOD'] = 'GET';
}
if (!isset($_SERVER['REQUEST_URI'])) {
    $_SERVER['REQUEST_URI'] = '/';
}
if (!isset($_SERVER['PHP_SELF'])) {
    $_SERVER['PHP_SELF'] = '/index.php';
}

// Prevent output buffering issues in tests
ob_start();

<?php
/**
 * Database Connection Test
 * 
 * Simple script to test if the database connection works
 * Access via: http://localhost/api/test-db.php
 */

// Load configuration
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

try {
    // Test database connection
    $pdo = db();
    
    // Test if users table exists and has data
    $stmt = $pdo->query('SELECT COUNT(*) as user_count FROM users');
    $userCount = $stmt->fetch()['user_count'];
    
    // Test if admin user exists
    $stmt = $pdo->prepare('SELECT username, role FROM users WHERE username = ?');
    $stmt->execute(['admin']);
    $adminUser = $stmt->fetch();
    
    // Test session table
    $stmt = $pdo->query('SELECT COUNT(*) as session_count FROM sessions');
    $sessionCount = $stmt->fetch()['session_count'];
    
    echo json_encode([
        'status' => 'success',
        'database' => 'connected',
        'user_count' => $userCount,
        'admin_user' => $adminUser ? $adminUser : 'not found',
        'session_count' => $sessionCount,
        'config' => [
            'db_host' => DB_HOST,
            'db_name' => DB_NAME,
            'session_timeout' => SESSION_TIMEOUT,
            'cors_origin' => CORS_ORIGIN
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'config_check' => [
            'db_host_defined' => defined('DB_HOST'),
            'db_name_defined' => defined('DB_NAME'),
            'config_file_exists' => file_exists(__DIR__ . '/config.php')
        ]
    ], JSON_PRETTY_PRINT);
}
?>
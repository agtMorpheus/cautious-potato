<?php
/**
 * API Configuration (Phase 5)
 * 
 * Configuration file for the Contract Manager REST API.
 * Loads environment-specific settings from .env or defaults.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'config.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

// Load environment variables from .env file if exists
$envFile = __DIR__ . '/../config/production.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

/**
 * Database configuration
 */
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'contract_manager');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET', 'utf8mb4');

/**
 * Application configuration
 */
define('APP_ENV', $_ENV['APP_ENV'] ?? 'development');
define('APP_DEBUG', filter_var($_ENV['APP_DEBUG'] ?? true, FILTER_VALIDATE_BOOLEAN));

/**
 * Session configuration
 */
define('SESSION_TIMEOUT', (int)($_ENV['SESSION_TIMEOUT'] ?? 7200)); // 2 hours default (increased)
define('SESSION_NAME', 'contract_manager_session');
define('SESSION_COOKIE_LIFETIME', (int)($_ENV['SESSION_COOKIE_LIFETIME'] ?? 0)); // 0 = until browser closes
define('SESSION_COOKIE_HTTPONLY', true);
define('SESSION_COOKIE_SECURE', filter_var($_ENV['SESSION_SECURE_COOKIE'] ?? false, FILTER_VALIDATE_BOOLEAN));
define('SESSION_COOKIE_SAMESITE', $_ENV['SESSION_SAMESITE'] ?? 'Lax');

/**
 * Security configuration
 */
define('CSRF_ENABLED', filter_var($_ENV['CSRF_TOKEN_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN));
define('SECURE_COOKIES', filter_var($_ENV['SESSION_SECURE_COOKIE'] ?? false, FILTER_VALIDATE_BOOLEAN));

/**
 * CORS configuration - Fixed for credentials
 */
define('CORS_ORIGIN', $_ENV['CORS_ORIGIN'] ?? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000');

/**
 * Logging configuration
 */
define('LOG_LEVEL', $_ENV['LOG_LEVEL'] ?? 'info');
define('LOG_FILE', $_ENV['LOG_FILE'] ?? __DIR__ . '/../logs/app.log');

/**
 * API rate limiting (requests per minute)
 */
define('RATE_LIMIT', (int)($_ENV['RATE_LIMIT'] ?? 60));

/**
 * File upload limits
 */
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10 MB
define('ALLOWED_EXTENSIONS', ['xlsx', 'xls']);

/**
 * Pagination defaults
 */
define('DEFAULT_PAGE_SIZE', 50);
define('MAX_PAGE_SIZE', 100);

/**
 * Initialize error reporting based on environment
 */
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(E_ERROR | E_WARNING | E_PARSE);
    ini_set('display_errors', 0);
}

/**
 * Set timezone
 */
date_default_timezone_set('Europe/Berlin');

/**
 * Database connection singleton
 */
/**
 * Custom exception for database connection errors
 */
class DatabaseConnectionException extends Exception {
    public function __construct($message = 'Database connection failed', $code = 0, Exception $previous = null) {
        parent::__construct($message, $code, $previous);
    }
}

class Database {
    private static $instance = null;
    private $pdo;
    private $dsn;
    private $options;
    
    private function __construct() {
        $this->dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );
        
        $this->options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5, // Connection timeout in seconds
        ];
        
        $this->connect();
    }
    
    /**
     * Establish database connection
     * @throws DatabaseConnectionException
     */
    private function connect() {
        try {
            $this->pdo = new PDO($this->dsn, DB_USER, DB_PASS, $this->options);
        } catch (PDOException $e) {
            $message = APP_DEBUG ? 'Database connection failed: ' . $e->getMessage() : 'Database connection failed';
            throw new DatabaseConnectionException($message, (int)$e->getCode(), $e);
        }
    }
    
    /**
     * Check if connection is alive and reconnect if needed
     * @return bool
     */
    public function isConnected() {
        if ($this->pdo === null) {
            return false;
        }
        
        try {
            $this->pdo->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    /**
     * Reconnect to database if connection was lost
     * @throws DatabaseConnectionException
     */
    public function reconnect() {
        $this->pdo = null;
        $this->connect();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Get database connection, reconnecting if necessary
     * @return PDO
     * @throws DatabaseConnectionException
     */
    public function getConnection() {
        if (!$this->isConnected()) {
            $this->reconnect();
        }
        return $this->pdo;
    }
    
    /**
     * Test database connection
     * @return bool True if connection is successful
     */
    public static function testConnection() {
        try {
            $instance = self::getInstance();
            return $instance->isConnected();
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Reset singleton instance (useful for testing)
     */
    public static function resetInstance() {
        self::$instance = null;
    }
    
    // Prevent cloning and unserialization
    private function __clone() {}
    public function __wakeup() {
        throw new Exception('Cannot unserialize singleton');
    }
}

/**
 * Get database connection
 * @return PDO
 * @throws DatabaseConnectionException
 */
function db() {
    return Database::getInstance()->getConnection();
}

/**
 * Helper function to generate UUID
 * @return string UUID v4
 */
function generateUUID() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Send JSON response
 * @param mixed $data Response data
 * @param int $code HTTP status code
 * @param string $status Status string ('success' or 'error')
 */
function jsonResponse($data, $code = 200, $status = 'success') {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    
    echo json_encode([
        'status' => $status,
        'code' => $code,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send error response
 * @param string $message Error message
 * @param int $code HTTP status code
 * @param string $errorCode Error code identifier
 * @param array $details Additional error details
 */
function errorResponse($message, $code = 400, $errorCode = 'error', $details = []) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    
    $response = [
        'status' => 'error',
        'code' => $code,
        'error' => $errorCode,
        'message' => $message
    ];
    
    if (!empty($details) && APP_DEBUG) {
        $response['details'] = $details;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Get JSON request body
 * @return array Parsed JSON data
 */
function getJsonBody() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        errorResponse('Invalid JSON body', 400, 'invalid_json');
    }
    
    return $data ?? [];
}

/**
 * Sanitize string input
 * @param string $input Input string
 * @return string Sanitized string
 */
function sanitize($input) {
    if ($input === null) return null;
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

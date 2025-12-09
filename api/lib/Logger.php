<?php
/**
 * Logger Library (Phase 5)
 * 
 * Server-side logging for the Contract Manager API.
 * Supports multiple log levels and structured logging.
 */

class Logger {
    /**
     * Log levels (lower number = higher priority)
     */
    const LEVELS = [
        'error' => 0,
        'warning' => 1,
        'info' => 2,
        'debug' => 3
    ];
    
    /**
     * Current log level
     */
    private static $level = null;
    
    /**
     * Log an error message
     * @param string $message Log message
     * @param array $context Additional context
     */
    public static function error($message, $context = []) {
        self::log('error', $message, $context);
    }
    
    /**
     * Log a warning message
     * @param string $message Log message
     * @param array $context Additional context
     */
    public static function warning($message, $context = []) {
        self::log('warning', $message, $context);
    }
    
    /**
     * Log an info message
     * @param string $message Log message
     * @param array $context Additional context
     */
    public static function info($message, $context = []) {
        self::log('info', $message, $context);
    }
    
    /**
     * Log a debug message
     * @param string $message Log message
     * @param array $context Additional context
     */
    public static function debug($message, $context = []) {
        self::log('debug', $message, $context);
    }
    
    /**
     * Main log method
     * @param string $level Log level
     * @param string $message Log message
     * @param array $context Additional context
     */
    private static function log($level, $message, $context = []) {
        // Check if this level should be logged
        if (!self::shouldLog($level)) {
            return;
        }
        
        // Build log entry
        $entry = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'level' => strtoupper($level),
            'message' => $message,
            'context' => array_merge($context, [
                'user_id' => $_SESSION['user_id'] ?? null,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                'request_id' => self::getRequestId()
            ])
        ];
        
        // Write to file
        self::writeToFile($entry);
        
        // Write to database (for error and warning levels)
        if (in_array($level, ['error', 'warning'])) {
            self::writeToDatabase($level, $message, $context);
        }
    }
    
    /**
     * Check if a level should be logged
     * @param string $level Level to check
     * @return bool
     */
    private static function shouldLog($level) {
        if (self::$level === null) {
            self::$level = defined('LOG_LEVEL') ? LOG_LEVEL : 'info';
        }
        
        $configuredLevel = self::LEVELS[self::$level] ?? 2;
        $messageLevel = self::LEVELS[$level] ?? 2;
        
        return $messageLevel <= $configuredLevel;
    }
    
    /**
     * Write log entry to file
     * @param array $entry Log entry
     */
    private static function writeToFile($entry) {
        $logFile = defined('LOG_FILE') ? LOG_FILE : __DIR__ . '/../../logs/app.log';
        
        // Ensure log directory exists
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        // Format log line
        $logLine = json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
        
        // Write to file (append mode)
        file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Write log entry to database
     * @param string $level Log level
     * @param string $message Log message
     * @param array $context Context data
     */
    private static function writeToDatabase($level, $message, $context) {
        try {
            $pdo = db();
            $stmt = $pdo->prepare('
                INSERT INTO logs (log_level, message, context)
                VALUES (?, ?, ?)
            ');
            $stmt->execute([
                $level,
                $message,
                json_encode($context, JSON_UNESCAPED_UNICODE)
            ]);
        } catch (Exception $e) {
            // Silently fail database logging to prevent infinite loops
            error_log('Failed to write to log database: ' . $e->getMessage());
        }
    }
    
    /**
     * Get or generate request ID for tracing
     * @return string
     */
    private static function getRequestId() {
        static $requestId = null;
        
        if ($requestId === null) {
            $requestId = substr(md5(uniqid(mt_rand(), true)), 0, 8);
        }
        
        return $requestId;
    }
    
    /**
     * Set log level
     * @param string $level Log level
     */
    public static function setLevel($level) {
        if (isset(self::LEVELS[$level])) {
            self::$level = $level;
        }
    }
}

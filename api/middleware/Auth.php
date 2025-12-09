<?php
/**
 * Authentication Middleware (Phase 5)
 * 
 * Handles session-based authentication and role-based authorization.
 */

class Auth {
    /**
     * Require user to be logged in
     * Throws 401 if not authenticated
     */
    public static function requireLogin() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'status' => 'error',
                'code' => 401,
                'error' => 'unauthorized',
                'message' => 'Authentication required'
            ]);
            exit;
        }
        
        // Check session timeout
        if (isset($_SESSION['last_activity'])) {
            $inactiveTime = time() - $_SESSION['last_activity'];
            if ($inactiveTime > SESSION_TIMEOUT) {
                self::destroySession();
                http_response_code(401);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'status' => 'error',
                    'code' => 401,
                    'error' => 'session_expired',
                    'message' => 'Session expired'
                ]);
                exit;
            }
        }
        
        // Update last activity
        $_SESSION['last_activity'] = time();
    }
    
    /**
     * Require specific role
     * @param string|array $roles Required role(s)
     */
    public static function requireRole($roles) {
        self::requireLogin();
        
        if (!is_array($roles)) {
            $roles = [$roles];
        }
        
        $userRole = $_SESSION['role'] ?? 'viewer';
        
        // Admins have access to everything
        if ($userRole === 'admin') {
            return;
        }
        
        if (!in_array($userRole, $roles)) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'status' => 'error',
                'code' => 403,
                'error' => 'forbidden',
                'message' => 'Insufficient permissions'
            ]);
            exit;
        }
    }
    
    /**
     * Check if user is logged in
     * @return bool
     */
    public static function isLoggedIn() {
        return isset($_SESSION['user_id']);
    }
    
    /**
     * Get current user ID
     * @return int|null
     */
    public static function userId() {
        return $_SESSION['user_id'] ?? null;
    }
    
    /**
     * Get current user role
     * @return string|null
     */
    public static function role() {
        return $_SESSION['role'] ?? null;
    }
    
    /**
     * Get current user data
     * @return array|null
     */
    public static function user() {
        if (!self::isLoggedIn()) {
            return null;
        }
        
        return [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'] ?? null,
            'email' => $_SESSION['email'] ?? null,
            'role' => $_SESSION['role'] ?? 'viewer'
        ];
    }
    
    /**
     * Create user session
     * @param array $user User data from database
     * @return string Session ID
     */
    public static function createSession($user) {
        // Regenerate session ID to prevent fixation
        session_regenerate_id(true);
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['last_activity'] = time();
        $_SESSION['created_at'] = time();
        
        // Store session in database
        self::storeSession(session_id(), $user['id']);
        
        return session_id();
    }
    
    /**
     * Destroy current session
     */
    public static function destroySession() {
        $userId = $_SESSION['user_id'] ?? null;
        
        // Remove from database
        if ($userId) {
            self::removeSession(session_id());
        }
        
        // Clear session data
        $_SESSION = [];
        
        // Delete session cookie
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }
        
        // Destroy session
        session_destroy();
    }
    
    /**
     * Store session in database
     * @param string $sessionId Session ID
     * @param int $userId User ID
     */
    private static function storeSession($sessionId, $userId) {
        try {
            $pdo = db();
            $stmt = $pdo->prepare('
                INSERT INTO sessions (id, user_id, ip_address, user_agent)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP
            ');
            
            // Sanitize user agent - remove null bytes and control characters
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $userAgent = preg_replace('/[\x00-\x1F\x7F]/', '', $userAgent);
            $userAgent = substr($userAgent, 0, 500);
            
            $stmt->execute([
                $sessionId,
                $userId,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $userAgent
            ]);
        } catch (Exception $e) {
            // Log but don't fail login
            Logger::warning('Failed to store session', ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * Remove session from database
     * @param string $sessionId Session ID
     */
    private static function removeSession($sessionId) {
        try {
            $pdo = db();
            $stmt = $pdo->prepare('DELETE FROM sessions WHERE id = ?');
            $stmt->execute([$sessionId]);
        } catch (Exception $e) {
            Logger::warning('Failed to remove session', ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * Hash a password
     * @param string $password Plain text password
     * @return string Hashed password
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }
    
    /**
     * Verify a password
     * @param string $password Plain text password
     * @param string $hash Stored hash
     * @return bool
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
}

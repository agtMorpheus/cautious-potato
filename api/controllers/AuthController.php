<?php
/**
 * Authentication Controller (Phase 5)
 * 
 * Handles user authentication endpoints:
 * - POST /api/auth/login
 * - POST /api/auth/logout
 * - GET /api/auth/me
 */

class AuthController {
    /**
     * @var PDO
     */
    private $pdo;

    /**
     * Constructor with dependency injection
     * @param PDO|null $pdo Database connection
     */
    public function __construct($pdo = null) {
        $this->pdo = $pdo ?? db();
    }

    /**
     * POST /api/auth/login
     * Authenticate user with username/password
     * @param array|null $inputData Optional injected data for testing
     */
    public function login($inputData = null) {
        $data = $inputData ?? getJsonBody();
        
        $username = sanitize($data['username'] ?? '');
        $password = $data['password'] ?? '';
        
        // Validate input
        if (empty($username) || empty($password)) {
            return $this->sendError('Username and password are required', 400, 'missing_credentials');
        }
        
        try {
            // Find user by username
            $stmt = $this->pdo->prepare('
                SELECT id, username, email, password_hash, role, is_active
                FROM users
                WHERE username = ?
                LIMIT 1
            ');
            $stmt->execute([$username]);
            $user = $stmt->fetch();
            
            // Validate credentials
            if (!$user || !Auth::verifyPassword($password, $user['password_hash'])) {
                Logger::warning('Failed login attempt', ['username' => $username]);
                return $this->sendError('Invalid username or password', 401, 'invalid_credentials');
            }
            
            // Check if user is active
            if (!$user['is_active']) {
                Logger::warning('Inactive user login attempt', ['username' => $username]);
                return $this->sendError('Account is deactivated', 403, 'user_inactive');
            }
            
            // Create session
            Auth::createSession($user);
            
            Logger::info('User logged in', ['user_id' => $user['id']]);
            
            // Return user info (exclude sensitive data)
            return $this->sendJson([
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]
            ]);
            
        } catch (Exception $e) {
            Logger::error('Login error', ['error' => $e->getMessage()]);
            return $this->sendError('Login failed', 500, 'login_error');
        }
    }
    
    /**
     * POST /api/auth/logout
     * Log out current user
     */
    public function logout() {
        $userId = Auth::userId();
        
        Auth::destroySession();
        
        Logger::info('User logged out', ['user_id' => $userId]);
        
        return $this->sendJson(['logged_out' => true]);
    }
    
    /**
     * GET /api/auth/me
     * Get current user info
     */
    public function me() {
        $user = Auth::user();
        
        if (!$user) {
            return $this->sendError('Not authenticated', 401, 'unauthorized');
        }
        
        return $this->sendJson(['user' => $user]);
    }

    /**
     * Wrapper for jsonResponse to allow mocking
     */
    protected function sendJson($data, $code = 200, $status = 'success') {
        jsonResponse($data, $code, $status);
    }

    /**
     * Wrapper for errorResponse to allow mocking
     */
    protected function sendError($message, $code = 400, $errorCode = 'error', $details = []) {
        errorResponse($message, $code, $errorCode, $details);
    }
}

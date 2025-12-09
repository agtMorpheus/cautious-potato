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
     * POST /api/auth/login
     * Authenticate user with username/password
     */
    public function login() {
        $data = getJsonBody();
        
        $username = sanitize($data['username'] ?? '');
        $password = $data['password'] ?? '';
        
        // Validate input
        if (empty($username) || empty($password)) {
            errorResponse('Username and password are required', 400, 'missing_credentials');
        }
        
        try {
            $pdo = db();
            
            // Find user by username
            $stmt = $pdo->prepare('
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
                errorResponse('Invalid username or password', 401, 'invalid_credentials');
            }
            
            // Check if user is active
            if (!$user['is_active']) {
                Logger::warning('Inactive user login attempt', ['username' => $username]);
                errorResponse('Account is deactivated', 403, 'user_inactive');
            }
            
            // Create session
            Auth::createSession($user);
            
            Logger::info('User logged in', ['user_id' => $user['id']]);
            
            // Return user info (exclude sensitive data)
            jsonResponse([
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]
            ]);
            
        } catch (Exception $e) {
            Logger::error('Login error', ['error' => $e->getMessage()]);
            errorResponse('Login failed', 500, 'login_error');
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
        
        jsonResponse(['logged_out' => true]);
    }
    
    /**
     * GET /api/auth/me
     * Get current user info
     */
    public function me() {
        $user = Auth::user();
        
        if (!$user) {
            errorResponse('Not authenticated', 401, 'unauthorized');
        }
        
        jsonResponse(['user' => $user]);
    }
}

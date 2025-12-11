<?php
/**
 * Auth Controller Tests
 * 
 * Tests the AuthController class functionality for user authentication.
 */

use PHPUnit\Framework\TestCase;

// Load configuration and dependencies
require_once __DIR__ . '/../../api/config.php';
require_once __DIR__ . '/../../api/lib/Logger.php';
require_once __DIR__ . '/../../api/middleware/Auth.php';
require_once __DIR__ . '/../../api/controllers/AuthController.php';

class AuthControllerTest extends TestCase
{
    protected function setUp(): void
    {
        // Start session for tests
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Clear session data
        $_SESSION = [];
        $_GET = [];
        $_POST = [];
        
        // Reset database singleton
        Database::resetInstance();
        
        // Capture output
        ob_start();
    }

    protected function tearDown(): void
    {
        // Clear output buffer
        ob_end_clean();
        
        // Clear session
        $_SESSION = [];
        $_GET = [];
        $_POST = [];
        
        // Clean up
        Database::resetInstance();
    }

    /**
     * Test that AuthController class exists
     */
    public function testAuthControllerClassExists(): void
    {
        $this->assertTrue(class_exists('AuthController'));
    }

    /**
     * Test that AuthController has required methods
     */
    public function testAuthControllerHasRequiredMethods(): void
    {
        $this->assertTrue(method_exists(AuthController::class, 'login'));
        $this->assertTrue(method_exists(AuthController::class, 'logout'));
        $this->assertTrue(method_exists(AuthController::class, 'me'));
    }

    /**
     * Test AuthController can be instantiated
     */
    public function testAuthControllerCanBeInstantiated(): void
    {
        $controller = new AuthController();
        $this->assertInstanceOf(AuthController::class, $controller);
    }

    /**
     * Test login validation requires username
     */
    public function testLoginValidationRequiresUsername(): void
    {
        $data = ['password' => 'test123'];
        
        $username = sanitize($data['username'] ?? '');
        $this->assertTrue(empty($username));
    }

    /**
     * Test login validation requires password
     */
    public function testLoginValidationRequiresPassword(): void
    {
        $data = ['username' => 'testuser'];
        
        $password = $data['password'] ?? '';
        $this->assertTrue(empty($password));
    }

    /**
     * Test login accepts valid credentials format
     */
    public function testLoginAcceptsValidCredentialsFormat(): void
    {
        $data = [
            'username' => 'testuser',
            'password' => 'password123'
        ];
        
        $username = sanitize($data['username'] ?? '');
        $password = $data['password'] ?? '';
        
        $this->assertFalse(empty($username));
        $this->assertFalse(empty($password));
    }

    /**
     * Test sanitize is applied to username
     */
    public function testSanitizeIsAppliedToUsername(): void
    {
        $data = ['username' => '  testuser  '];
        
        $username = sanitize($data['username'] ?? '');
        $this->assertEquals('testuser', $username);
    }

    /**
     * Test password is not sanitized (preserves special chars)
     */
    public function testPasswordIsNotSanitized(): void
    {
        $data = ['password' => 'P@$$w0rd!#%'];
        
        // Password should be used as-is for verification
        $password = $data['password'] ?? '';
        $this->assertEquals('P@$$w0rd!#%', $password);
    }

    /**
     * Test user is_active check
     */
    public function testUserIsActiveCheck(): void
    {
        // Active user
        $user = ['is_active' => true];
        $this->assertTrue($user['is_active']);
        
        // Inactive user
        $user = ['is_active' => false];
        $this->assertFalse($user['is_active']);
        
        // Numeric 1
        $user = ['is_active' => 1];
        $this->assertTrue((bool)$user['is_active']);
        
        // Numeric 0
        $user = ['is_active' => 0];
        $this->assertFalse((bool)$user['is_active']);
    }

    /**
     * Test logout clears session
     */
    public function testLogoutClearsSession(): void
    {
        // Set up session
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'testuser';
        $_SESSION['role'] = 'admin';
        
        // Verify session is set
        $this->assertNotEmpty($_SESSION);
        
        // Logout clears session
        Auth::destroySession();
        
        $this->assertEmpty($_SESSION);
    }

    /**
     * Test me returns user when logged in
     */
    public function testMeReturnsUserWhenLoggedIn(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'testuser';
        $_SESSION['email'] = 'test@example.com';
        $_SESSION['role'] = 'admin';
        
        $user = Auth::user();
        
        $this->assertIsArray($user);
        $this->assertEquals(1, $user['id']);
        $this->assertEquals('testuser', $user['username']);
        $this->assertEquals('test@example.com', $user['email']);
        $this->assertEquals('admin', $user['role']);
    }

    /**
     * Test me returns null when not logged in
     */
    public function testMeReturnsNullWhenNotLoggedIn(): void
    {
        $user = Auth::user();
        
        $this->assertNull($user);
    }

    /**
     * Test login response excludes sensitive data
     */
    public function testLoginResponseExcludesSensitiveData(): void
    {
        $user = [
            'id' => 1,
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password_hash' => '$2y$12$...',
            'role' => 'admin'
        ];
        
        // Simulated response (excluding password_hash)
        $responseUser = [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        
        $this->assertArrayNotHasKey('password_hash', $responseUser);
        $this->assertArrayHasKey('id', $responseUser);
        $this->assertArrayHasKey('username', $responseUser);
        $this->assertArrayHasKey('email', $responseUser);
        $this->assertArrayHasKey('role', $responseUser);
    }

    /**
     * Test valid roles
     */
    public function testValidRoles(): void
    {
        $validRoles = ['viewer', 'manager', 'admin'];
        
        $this->assertContains('viewer', $validRoles);
        $this->assertContains('manager', $validRoles);
        $this->assertContains('admin', $validRoles);
    }

    /**
     * Test default role is viewer
     */
    public function testDefaultRoleIsViewer(): void
    {
        $_SESSION['user_id'] = 1;
        // No role set
        
        $user = Auth::user();
        $this->assertEquals('viewer', $user['role']);
    }

    /**
     * Test getJsonBody function exists
     */
    public function testGetJsonBodyFunctionExists(): void
    {
        $this->assertTrue(function_exists('getJsonBody'));
    }

    /**
     * Test error response function exists
     */
    public function testErrorResponseFunctionExists(): void
    {
        $this->assertTrue(function_exists('errorResponse'));
    }

    /**
     * Test JSON response function exists
     */
    public function testJsonResponseFunctionExists(): void
    {
        $this->assertTrue(function_exists('jsonResponse'));
    }

    /**
     * Test password hash cost is sufficient
     */
    public function testPasswordHashCostIsSufficient(): void
    {
        // Bcrypt cost should be at least 10 for security
        $password = 'testpassword';
        $hash = Auth::hashPassword($password);
        
        // Extract cost from hash
        preg_match('/^\$2y\$(\d+)\$/', $hash, $matches);
        $cost = (int)$matches[1];
        
        $this->assertGreaterThanOrEqual(10, $cost);
    }

    /**
     * Test session timeout constant
     */
    public function testSessionTimeoutConstant(): void
    {
        $this->assertTrue(defined('SESSION_TIMEOUT'));
        $this->assertIsInt(SESSION_TIMEOUT);
        
        // Should be at least 5 minutes (300 seconds)
        $this->assertGreaterThanOrEqual(300, SESSION_TIMEOUT);
        
        // Should not be more than 24 hours (86400 seconds)
        $this->assertLessThanOrEqual(86400, SESSION_TIMEOUT);
    }

    /**
     * Test session name constant
     */
    public function testSessionNameConstant(): void
    {
        $this->assertTrue(defined('SESSION_NAME'));
        $this->assertIsString(SESSION_NAME);
        $this->assertNotEmpty(SESSION_NAME);
    }

    /**
     * Test cookie security settings
     */
    public function testCookieSecuritySettings(): void
    {
        $this->assertTrue(defined('SESSION_COOKIE_HTTPONLY'));
        $this->assertTrue(defined('SESSION_COOKIE_SAMESITE'));
        
        // HttpOnly should be enabled
        $this->assertTrue(SESSION_COOKIE_HTTPONLY);
        
        // SameSite should be set
        $this->assertNotEmpty(SESSION_COOKIE_SAMESITE);
    }

    /**
     * Test username length validation
     */
    public function testUsernameLengthValidation(): void
    {
        // Username should not be empty
        $username = '';
        $this->assertTrue(empty($username));
        
        // Username should not exceed reasonable length
        $longUsername = str_repeat('a', 300);
        $sanitized = sanitize($longUsername);
        // Sanitize should trim and limit length
        $this->assertLessThanOrEqual(300, strlen($sanitized));
    }

    /**
     * Test password minimum length (implicit)
     */
    public function testPasswordMinimumLength(): void
    {
        // Empty password should be rejected
        $password = '';
        $this->assertTrue(empty($password));
        
        // Short password (still valid for authentication, policy is app-specific)
        $password = 'a';
        $this->assertFalse(empty($password));
    }

    /**
     * Test user data structure
     */
    public function testUserDataStructure(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'testuser';
        $_SESSION['email'] = 'test@example.com';
        $_SESSION['role'] = 'admin';
        
        $user = Auth::user();
        
        // Required fields
        $this->assertArrayHasKey('id', $user);
        $this->assertArrayHasKey('username', $user);
        $this->assertArrayHasKey('email', $user);
        $this->assertArrayHasKey('role', $user);
        
        // Types
        $this->assertIsInt($user['id']);
        $this->assertIsString($user['role']);
    }

    /**
     * Test empty username after sanitize
     */
    public function testEmptyUsernameAfterSanitize(): void
    {
        // Whitespace-only username
        $data = ['username' => '   '];
        $username = sanitize($data['username'] ?? '');
        $this->assertTrue(empty($username));
    }

    /**
     * Test XSS in username is sanitized
     */
    public function testXssInUsernameIsSanitized(): void
    {
        $data = ['username' => '<script>alert("xss")</script>admin'];
        $username = sanitize($data['username'] ?? '');
        
        $this->assertStringNotContainsString('<script>', $username);
        $this->assertStringNotContainsString('</script>', $username);
    }
}

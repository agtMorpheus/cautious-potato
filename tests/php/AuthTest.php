<?php
/**
 * Authentication Middleware Tests
 * 
 * Tests the Auth middleware class functionality including session management,
 * password hashing, and authentication flow.
 */

use PHPUnit\Framework\TestCase;

// Load configuration and dependencies
require_once __DIR__ . '/../../api/config.php';
require_once __DIR__ . '/../../api/lib/Logger.php';
require_once __DIR__ . '/../../api/middleware/Auth.php';

class AuthTest extends TestCase
{
    protected function setUp(): void
    {
        // Start session for tests
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Clear session data
        $_SESSION = [];
        
        // Reset database singleton
        Database::resetInstance();
    }

    protected function tearDown(): void
    {
        // Clear session
        $_SESSION = [];
        
        // Clean up
        Database::resetInstance();
    }

    /**
     * Test that Auth class exists
     */
    public function testAuthClassExists(): void
    {
        $this->assertTrue(class_exists('Auth'));
    }

    /**
     * Test that Auth class has required methods
     */
    public function testAuthClassHasRequiredMethods(): void
    {
        $this->assertTrue(method_exists(Auth::class, 'requireLogin'));
        $this->assertTrue(method_exists(Auth::class, 'requireRole'));
        $this->assertTrue(method_exists(Auth::class, 'isLoggedIn'));
        $this->assertTrue(method_exists(Auth::class, 'userId'));
        $this->assertTrue(method_exists(Auth::class, 'role'));
        $this->assertTrue(method_exists(Auth::class, 'user'));
        $this->assertTrue(method_exists(Auth::class, 'createSession'));
        $this->assertTrue(method_exists(Auth::class, 'destroySession'));
        $this->assertTrue(method_exists(Auth::class, 'hashPassword'));
        $this->assertTrue(method_exists(Auth::class, 'verifyPassword'));
    }

    /**
     * Test isLoggedIn returns false when not logged in
     */
    public function testIsLoggedInReturnsFalseWhenNotLoggedIn(): void
    {
        $this->assertFalse(Auth::isLoggedIn());
    }

    /**
     * Test isLoggedIn returns true when user_id is set
     */
    public function testIsLoggedInReturnsTrueWhenLoggedIn(): void
    {
        $_SESSION['user_id'] = 1;
        $this->assertTrue(Auth::isLoggedIn());
    }

    /**
     * Test userId returns null when not logged in
     */
    public function testUserIdReturnsNullWhenNotLoggedIn(): void
    {
        $this->assertNull(Auth::userId());
    }

    /**
     * Test userId returns user_id when logged in
     */
    public function testUserIdReturnsIdWhenLoggedIn(): void
    {
        $_SESSION['user_id'] = 42;
        $this->assertEquals(42, Auth::userId());
    }

    /**
     * Test role returns null when not logged in
     */
    public function testRoleReturnsNullWhenNotLoggedIn(): void
    {
        $this->assertNull(Auth::role());
    }

    /**
     * Test role returns role when logged in
     */
    public function testRoleReturnsRoleWhenLoggedIn(): void
    {
        $_SESSION['role'] = 'admin';
        $this->assertEquals('admin', Auth::role());
    }

    /**
     * Test user returns null when not logged in
     */
    public function testUserReturnsNullWhenNotLoggedIn(): void
    {
        $this->assertNull(Auth::user());
    }

    /**
     * Test user returns user data when logged in
     */
    public function testUserReturnsDataWhenLoggedIn(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'testuser';
        $_SESSION['email'] = 'test@example.com';
        $_SESSION['role'] = 'manager';

        $user = Auth::user();
        
        $this->assertIsArray($user);
        $this->assertEquals(1, $user['id']);
        $this->assertEquals('testuser', $user['username']);
        $this->assertEquals('test@example.com', $user['email']);
        $this->assertEquals('manager', $user['role']);
    }

    /**
     * Test user returns default role when role not set
     */
    public function testUserReturnsDefaultRoleWhenNotSet(): void
    {
        $_SESSION['user_id'] = 1;
        
        $user = Auth::user();
        
        $this->assertEquals('viewer', $user['role']);
    }

    /**
     * Test hashPassword returns a valid bcrypt hash
     */
    public function testHashPasswordReturnsBcryptHash(): void
    {
        $password = 'testpassword123';
        $hash = Auth::hashPassword($password);
        
        // Bcrypt hashes start with $2y$
        $this->assertStringStartsWith('$2y$', $hash);
        $this->assertEquals(60, strlen($hash));
    }

    /**
     * Test hashPassword generates different hashes for same password
     */
    public function testHashPasswordGeneratesUniqueHashes(): void
    {
        $password = 'testpassword123';
        $hash1 = Auth::hashPassword($password);
        $hash2 = Auth::hashPassword($password);
        
        // Bcrypt with random salt should generate different hashes
        $this->assertNotEquals($hash1, $hash2);
    }

    /**
     * Test verifyPassword returns true for correct password
     */
    public function testVerifyPasswordReturnsTrueForCorrectPassword(): void
    {
        $password = 'correctpassword';
        $hash = Auth::hashPassword($password);
        
        $this->assertTrue(Auth::verifyPassword($password, $hash));
    }

    /**
     * Test verifyPassword returns false for incorrect password
     */
    public function testVerifyPasswordReturnsFalseForIncorrectPassword(): void
    {
        $password = 'correctpassword';
        $hash = Auth::hashPassword($password);
        
        $this->assertFalse(Auth::verifyPassword('wrongpassword', $hash));
    }

    /**
     * Test verifyPassword handles empty password
     */
    public function testVerifyPasswordHandlesEmptyPassword(): void
    {
        $hash = Auth::hashPassword('somepassword');
        
        $this->assertFalse(Auth::verifyPassword('', $hash));
    }

    /**
     * Test verifyPassword handles special characters
     */
    public function testVerifyPasswordHandlesSpecialCharacters(): void
    {
        $password = 'P@$$w0rd!#%^&*()';
        $hash = Auth::hashPassword($password);
        
        $this->assertTrue(Auth::verifyPassword($password, $hash));
    }

    /**
     * Test verifyPassword handles Unicode characters
     */
    public function testVerifyPasswordHandlesUnicode(): void
    {
        $password = 'пароль日本語';
        $hash = Auth::hashPassword($password);
        
        $this->assertTrue(Auth::verifyPassword($password, $hash));
    }

    /**
     * Test verifyPassword handles very long passwords
     */
    public function testVerifyPasswordHandlesLongPasswords(): void
    {
        // Note: bcrypt only uses first 72 bytes
        $password = str_repeat('a', 100);
        $hash = Auth::hashPassword($password);
        
        $this->assertTrue(Auth::verifyPassword($password, $hash));
    }

    /**
     * Test createSession sets session variables correctly
     */
    public function testCreateSessionSetsSessionVariables(): void
    {
        $user = [
            'id' => 1,
            'username' => 'admin',
            'email' => 'admin@localhost',
            'role' => 'admin'
        ];
        
        $sessionId = Auth::createSession($user);
        
        $this->assertNotEmpty($sessionId);
        $this->assertEquals(1, $_SESSION['user_id']);
        $this->assertEquals('admin', $_SESSION['username']);
        $this->assertEquals('admin@localhost', $_SESSION['email']);
        $this->assertEquals('admin', $_SESSION['role']);
        $this->assertArrayHasKey('last_activity', $_SESSION);
        $this->assertArrayHasKey('created_at', $_SESSION);
    }

    /**
     * Test createSession sets timestamps correctly
     */
    public function testCreateSessionSetsTimestamps(): void
    {
        $user = [
            'id' => 1,
            'username' => 'test',
            'email' => 'test@test.com',
            'role' => 'viewer'
        ];
        
        $beforeCreate = time();
        Auth::createSession($user);
        $afterCreate = time();
        
        $this->assertGreaterThanOrEqual($beforeCreate, $_SESSION['last_activity']);
        $this->assertLessThanOrEqual($afterCreate, $_SESSION['last_activity']);
        $this->assertGreaterThanOrEqual($beforeCreate, $_SESSION['created_at']);
        $this->assertLessThanOrEqual($afterCreate, $_SESSION['created_at']);
    }

    /**
     * Test destroySession clears session data
     */
    public function testDestroySessionClearsSessionData(): void
    {
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'test';
        $_SESSION['role'] = 'admin';
        
        Auth::destroySession();
        
        $this->assertEmpty($_SESSION);
    }

    /**
     * Test session timeout constant is defined
     */
    public function testSessionTimeoutIsDefined(): void
    {
        $this->assertTrue(defined('SESSION_TIMEOUT'));
        $this->assertIsInt(SESSION_TIMEOUT);
        $this->assertGreaterThan(0, SESSION_TIMEOUT);
    }

    /**
     * Test DatabaseConnectionException is properly handled
     */
    public function testDatabaseConnectionExceptionClass(): void
    {
        $this->assertTrue(class_exists('DatabaseConnectionException'));
        
        $exception = new DatabaseConnectionException('Test error');
        $this->assertInstanceOf(Exception::class, $exception);
    }
}

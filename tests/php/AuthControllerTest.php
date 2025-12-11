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
    private $pdo;
    private $stmt;

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
        
        // Mock PDO
        $this->pdo = $this->getMockBuilder(PDO::class)
            ->disableOriginalConstructor()
            ->getMock();

        $this->stmt = $this->getMockBuilder(PDOStatement::class)
            ->getMock();

        $this->pdo->method('prepare')->willReturn($this->stmt);

        // Reset database singleton (though we inject PDO now)
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
        
        // Clean up
        Database::resetInstance();
    }

    /**
     * Test logic with mocked controller
     */
    public function testLoginSuccess()
    {
        // Create partial mock of AuthController to intercept response methods
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        // Mock user data from DB
        $password = 'secret';
        $hash = password_hash($password, PASSWORD_BCRYPT);
        
        $user = [
            'id' => 1,
            'username' => 'admin',
            'email' => 'admin@example.com',
            'password_hash' => $hash,
            'role' => 'admin',
            'is_active' => 1
        ];
        
        $this->stmt->method('fetch')->willReturn($user);
        
        // Expect success response
        $controller->expects($this->once())
            ->method('sendJson')
            ->with($this->callback(function($data) {
                return $data['user']['username'] === 'admin';
            }));

        $controller->expects($this->never())->method('sendError');
        
        // Call login with data
        $controller->login([
            'username' => 'admin',
            'password' => 'secret'
        ]);
        
        // Verify session created
        $this->assertEquals(1, $_SESSION['user_id']);
    }

    public function testLoginInvalidCredentials()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        // Mock user found but wrong password
        $user = [
            'id' => 1,
            'username' => 'admin',
            'password_hash' => password_hash('secret', PASSWORD_BCRYPT),
            'is_active' => 1
        ];
        
        $this->stmt->method('fetch')->willReturn($user);
        
        $controller->expects($this->once())
            ->method('sendError')
            ->with('Invalid username or password', 401);

        $controller->login([
            'username' => 'admin',
            'password' => 'wrong'
        ]);
    }

    public function testLoginInactiveUser()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        $user = [
            'id' => 1,
            'username' => 'admin',
            'password_hash' => password_hash('secret', PASSWORD_BCRYPT),
            'is_active' => 0 // Inactive
        ];
        
        $this->stmt->method('fetch')->willReturn($user);
        
        $controller->expects($this->once())
            ->method('sendError')
            ->with('Account is deactivated', 403);

        $controller->login([
            'username' => 'admin',
            'password' => 'secret'
        ]);
    }

    public function testMeAuthenticated()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'user';
        $_SESSION['role'] = 'viewer';
        
        $controller->expects($this->once())
            ->method('sendJson')
            ->with($this->callback(function($data) {
                return $data['user']['username'] === 'user';
            }));

        $controller->me();
    }

    public function testMeUnauthenticated()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        $_SESSION = [];
        
        $controller->expects($this->once())
            ->method('sendError')
            ->with('Not authenticated', 401);

        $controller->me();
    }

    /**
     * Test login with missing username
     */
    public function testLoginMissingUsername()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        $controller->expects($this->once())
            ->method('sendError')
            ->with('Username and password are required', 400);

        $controller->login([
            'username' => '',
            'password' => 'secret'
        ]);
    }

    /**
     * Test login with missing password
     */
    public function testLoginMissingPassword()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        $controller->expects($this->once())
            ->method('sendError')
            ->with('Username and password are required', 400);

        $controller->login([
            'username' => 'admin',
            'password' => ''
        ]);
    }

    /**
     * Test login with user not found
     */
    public function testLoginUserNotFound()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        // No user found in database
        $this->stmt->method('fetch')->willReturn(false);
        
        $controller->expects($this->once())
            ->method('sendError')
            ->with('Invalid username or password', 401);

        $controller->login([
            'username' => 'nonexistent',
            'password' => 'secret'
        ]);
    }

    /**
     * Test login database error handling
     */
    public function testLoginDatabaseError()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        // Simulate database exception
        $this->stmt->method('fetch')->willThrowException(new Exception('Database error'));
        
        $controller->expects($this->once())
            ->method('sendError')
            ->with('Login failed', 500);

        $controller->login([
            'username' => 'admin',
            'password' => 'secret'
        ]);
    }

    /**
     * Test logout functionality
     */
    public function testLogout()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        // Set up session
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'testuser';
        
        $controller->expects($this->once())
            ->method('sendJson')
            ->with($this->callback(function($data) {
                return isset($data['logged_out']) && $data['logged_out'] === true;
            }));

        $controller->logout();
        
        // Verify session is cleared
        $this->assertArrayNotHasKey('user_id', $_SESSION);
    }

    /**
     * Test logout when not logged in
     */
    public function testLogoutWhenNotLoggedIn()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        // Empty session
        $_SESSION = [];
        
        $controller->expects($this->once())
            ->method('sendJson')
            ->with($this->callback(function($data) {
                return isset($data['logged_out']) && $data['logged_out'] === true;
            }));

        $controller->logout();
    }

    /**
     * Test login with empty data array
     */
    public function testLoginWithEmptyData()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        $controller->expects($this->once())
            ->method('sendError')
            ->with('Username and password are required', 400);

        $controller->login([]);
    }

    /**
     * Test me with different roles
     */
    public function testMeWithDifferentRoles()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        // Test admin role
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = 'admin';
        $_SESSION['role'] = 'admin';
        
        $controller->expects($this->once())
            ->method('sendJson')
            ->with($this->callback(function($data) {
                return $data['user']['role'] === 'admin';
            }));

        $controller->me();
    }

    /**
     * Test login creates session with correct data
     */
    public function testLoginCreatesSessionWithCorrectData()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        $password = 'testpass';
        $hash = password_hash($password, PASSWORD_BCRYPT);
        
        $user = [
            'id' => 42,
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password_hash' => $hash,
            'role' => 'viewer',
            'is_active' => 1
        ];
        
        $this->stmt->method('fetch')->willReturn($user);
        
        $controller->login([
            'username' => 'testuser',
            'password' => 'testpass'
        ]);
        
        // Verify session data
        $this->assertEquals(42, $_SESSION['user_id']);
        $this->assertEquals('testuser', $_SESSION['username']);
        $this->assertEquals('viewer', $_SESSION['role']);
        $this->assertEquals('test@example.com', $_SESSION['email']);
    }

    /**
     * Test login response excludes sensitive data
     */
    public function testLoginResponseExcludesSensitiveData()
    {
        $controller = $this->getMockBuilder(AuthController::class)
            ->setConstructorArgs([$this->pdo])
            ->onlyMethods(['sendJson', 'sendError'])
            ->getMock();

        $password = 'secret';
        $hash = password_hash($password, PASSWORD_BCRYPT);
        
        $user = [
            'id' => 1,
            'username' => 'admin',
            'email' => 'admin@example.com',
            'password_hash' => $hash,
            'role' => 'admin',
            'is_active' => 1
        ];
        
        $this->stmt->method('fetch')->willReturn($user);
        
        $controller->expects($this->once())
            ->method('sendJson')
            ->with($this->callback(function($data) {
                // Should not include password_hash or is_active
                return isset($data['user']['id']) 
                    && isset($data['user']['username'])
                    && isset($data['user']['email'])
                    && isset($data['user']['role'])
                    && !isset($data['user']['password_hash'])
                    && !isset($data['user']['is_active']);
            }));

        $controller->login([
            'username' => 'admin',
            'password' => 'secret'
        ]);
    }

    /**
     * Existing tests for helper functions (kept for regression)
     */
    public function testSanitize() {
        $this->assertEquals('test', sanitize(' test '));
    }
}

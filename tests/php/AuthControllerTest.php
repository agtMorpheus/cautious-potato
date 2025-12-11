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
     * Existing tests for helper functions (kept for regression)
     */
    public function testSanitize() {
        $this->assertEquals('test', sanitize(' test '));
    }
}

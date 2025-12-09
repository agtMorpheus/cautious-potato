<?php
/**
 * API Router / Entry Point (Phase 5)
 * 
 * Main entry point for the Contract Manager REST API.
 * Routes incoming requests to appropriate controllers.
 */

// Load configuration
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware/Auth.php';
require_once __DIR__ . '/lib/Logger.php';

// Start session
session_name(SESSION_NAME);
session_start();

// Set CORS headers
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Parse request
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Remove query string and base path
$basePath = '/api';
$path = parse_url($requestUri, PHP_URL_PATH);
if (strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}
$path = trim($path, '/');
$segments = $path ? explode('/', $path) : [];

// Global error handler
set_exception_handler(function($e) {
    Logger::error('Uncaught exception', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    errorResponse(
        APP_DEBUG ? $e->getMessage() : 'Internal server error',
        500,
        'server_error'
    );
});

// Route request
try {
    route($requestMethod, $segments);
} catch (Exception $e) {
    Logger::error('Request error', [
        'message' => $e->getMessage(),
        'path' => $path,
        'method' => $requestMethod
    ]);
    
    errorResponse(
        APP_DEBUG ? $e->getMessage() : 'An error occurred',
        500,
        'server_error'
    );
}

/**
 * Route request to appropriate handler
 * @param string $method HTTP method
 * @param array $segments URL path segments
 */
function route($method, $segments) {
    $resource = $segments[0] ?? '';
    $id = $segments[1] ?? null;
    $action = $segments[2] ?? null;
    
    switch ($resource) {
        case 'auth':
            handleAuthRoutes($method, $id);
            break;
            
        case 'contracts':
            handleContractRoutes($method, $id, $action);
            break;
            
        case 'imports':
            handleImportRoutes($method, $id, $action);
            break;
            
        case 'health':
            // Health check endpoint (no auth required)
            jsonResponse(['status' => 'healthy', 'timestamp' => date('c')]);
            break;
            
        default:
            errorResponse('Endpoint not found', 404, 'not_found');
    }
}

/**
 * Handle authentication routes
 */
function handleAuthRoutes($method, $action) {
    require_once __DIR__ . '/controllers/AuthController.php';
    $controller = new AuthController();
    
    switch ($action) {
        case 'login':
            if ($method !== 'POST') methodNotAllowed();
            $controller->login();
            break;
            
        case 'logout':
            if ($method !== 'POST') methodNotAllowed();
            Auth::requireLogin();
            $controller->logout();
            break;
            
        case 'me':
            if ($method !== 'GET') methodNotAllowed();
            $controller->me();
            break;
            
        default:
            errorResponse('Auth endpoint not found', 404, 'not_found');
    }
}

/**
 * Handle contract routes
 */
function handleContractRoutes($method, $id, $action) {
    require_once __DIR__ . '/controllers/ContractController.php';
    $controller = new ContractController();
    
    // All contract routes require authentication
    Auth::requireLogin();
    
    // Handle special actions
    if ($id === 'bulk-update' && $method === 'POST') {
        $controller->bulkUpdate();
        return;
    }
    
    if ($id === 'export' && $method === 'POST') {
        $controller->export();
        return;
    }
    
    // Handle CRUD operations
    switch ($method) {
        case 'GET':
            if ($id) {
                $controller->get($id);
            } else {
                $controller->list();
            }
            break;
            
        case 'POST':
            $controller->create();
            break;
            
        case 'PUT':
            if (!$id) errorResponse('Contract ID required', 400, 'missing_id');
            $controller->update($id);
            break;
            
        case 'DELETE':
            if (!$id) errorResponse('Contract ID required', 400, 'missing_id');
            Auth::requireRole('admin'); // Only admins can delete
            $controller->delete($id);
            break;
            
        default:
            methodNotAllowed();
    }
}

/**
 * Handle import routes
 */
function handleImportRoutes($method, $id, $action) {
    require_once __DIR__ . '/controllers/ImportController.php';
    $controller = new ImportController();
    
    // All import routes require authentication
    Auth::requireLogin();
    
    // Get import errors
    if ($id && $action === 'errors' && $method === 'GET') {
        $controller->getErrors($id);
        return;
    }
    
    switch ($method) {
        case 'GET':
            if ($id) {
                $controller->get($id);
            } else {
                $controller->list();
            }
            break;
            
        case 'POST':
            $controller->upload();
            break;
            
        default:
            methodNotAllowed();
    }
}

/**
 * Return 405 Method Not Allowed
 */
function methodNotAllowed() {
    errorResponse('Method not allowed', 405, 'method_not_allowed');
}

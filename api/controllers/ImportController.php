<?php
/**
 * Import Controller (Phase 5)
 * 
 * Handles file import operations:
 * - GET /api/imports - List import history
 * - GET /api/imports/:id - Get single import
 * - GET /api/imports/:id/errors - Get import errors
 * - POST /api/imports - Upload and process import
 */

class ImportController {
    /**
     * GET /api/imports
     * List import history
     */
    public function list() {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        try {
            $pdo = db();
            
            // Get total count
            $countStmt = $pdo->query('SELECT COUNT(*) FROM imports');
            $total = (int)$countStmt->fetchColumn();
            
            // Get imports with user info
            $stmt = $pdo->prepare('
                SELECT i.*, u.username as imported_by_username
                FROM imports i
                LEFT JOIN users u ON i.imported_by = u.id
                ORDER BY i.imported_at DESC
                LIMIT ? OFFSET ?
            ');
            $stmt->execute([$limit, $offset]);
            $imports = $stmt->fetchAll();
            
            jsonResponse([
                'imports' => $imports,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            
        } catch (Exception $e) {
            Logger::error('Failed to list imports', ['error' => $e->getMessage()]);
            errorResponse('Failed to fetch imports', 500, 'fetch_error');
        }
    }
    
    /**
     * GET /api/imports/:id
     * Get single import details
     */
    public function get($id) {
        try {
            $pdo = db();
            
            $stmt = $pdo->prepare('
                SELECT i.*, u.username as imported_by_username
                FROM imports i
                LEFT JOIN users u ON i.imported_by = u.id
                WHERE i.id = ?
            ');
            $stmt->execute([$id]);
            $import = $stmt->fetch();
            
            if (!$import) {
                errorResponse('Import not found', 404, 'not_found');
            }
            
            // Get error count
            $errorStmt = $pdo->prepare('SELECT COUNT(*) FROM import_errors WHERE import_id = ?');
            $errorStmt->execute([$id]);
            $import['error_count'] = (int)$errorStmt->fetchColumn();
            
            jsonResponse($import);
            
        } catch (Exception $e) {
            Logger::error('Failed to get import', ['id' => $id, 'error' => $e->getMessage()]);
            errorResponse('Failed to fetch import', 500, 'fetch_error');
        }
    }
    
    /**
     * GET /api/imports/:id/errors
     * Get errors for an import
     */
    public function getErrors($id) {
        try {
            $pdo = db();
            
            // Verify import exists
            $checkStmt = $pdo->prepare('SELECT id FROM imports WHERE id = ?');
            $checkStmt->execute([$id]);
            if (!$checkStmt->fetch()) {
                errorResponse('Import not found', 404, 'not_found');
            }
            
            $stmt = $pdo->prepare('
                SELECT * FROM import_errors
                WHERE import_id = ?
                ORDER BY row_number ASC
            ');
            $stmt->execute([$id]);
            $errors = $stmt->fetchAll();
            
            jsonResponse([
                'import_id' => $id,
                'errors' => $errors,
                'count' => count($errors)
            ]);
            
        } catch (Exception $e) {
            Logger::error('Failed to get import errors', ['id' => $id, 'error' => $e->getMessage()]);
            errorResponse('Failed to fetch import errors', 500, 'fetch_error');
        }
    }
    
    /**
     * POST /api/imports
     * Upload and process a file import
     */
    public function upload() {
        // Check if file was uploaded
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $errorCode = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
            errorResponse($this->getUploadErrorMessage($errorCode), 400, 'upload_error');
        }
        
        $file = $_FILES['file'];
        
        // Validate file size
        if ($file['size'] > MAX_UPLOAD_SIZE) {
            errorResponse('File too large (max ' . (MAX_UPLOAD_SIZE / 1024 / 1024) . ' MB)', 400, 'file_too_large');
        }
        
        // Validate file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, ALLOWED_EXTENSIONS)) {
            errorResponse('Invalid file type. Allowed: ' . implode(', ', ALLOWED_EXTENSIONS), 400, 'invalid_file_type');
        }
        
        // Get mapping configuration if provided
        $mapping = null;
        if (isset($_POST['mapping'])) {
            $mapping = json_decode($_POST['mapping'], true);
        }
        
        try {
            $pdo = db();
            
            // Create import record
            $stmt = $pdo->prepare('
                INSERT INTO imports (file_name, file_size, import_mapping, imported_by)
                VALUES (?, ?, ?, ?)
            ');
            $stmt->execute([
                sanitize($file['name']),
                $file['size'],
                $mapping ? json_encode($mapping) : null,
                Auth::userId()
            ]);
            $importId = $pdo->lastInsertId();
            
            // In a full implementation, you would process the Excel file here
            // using PHPSpreadsheet or similar library
            // For now, we just record the upload
            
            Logger::info('File uploaded for import', [
                'import_id' => $importId,
                'filename' => $file['name'],
                'size' => $file['size']
            ]);
            
            // Update import record with results
            $stmt = $pdo->prepare('
                UPDATE imports 
                SET records_imported = 0, records_with_errors = 0
                WHERE id = ?
            ');
            $stmt->execute([$importId]);
            
            // Fetch created import
            $stmt = $pdo->prepare('SELECT * FROM imports WHERE id = ?');
            $stmt->execute([$importId]);
            $import = $stmt->fetch();
            
            jsonResponse([
                'import' => $import,
                'message' => 'File uploaded successfully. Processing will be handled by client-side parser.'
            ], 201);
            
        } catch (Exception $e) {
            Logger::error('Import upload failed', ['error' => $e->getMessage()]);
            errorResponse('Import failed', 500, 'import_error');
        }
    }
    
    /**
     * Get human-readable upload error message
     */
    private function getUploadErrorMessage($errorCode) {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds server limit',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form limit',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
        ];
        
        return $messages[$errorCode] ?? 'Unknown upload error';
    }
}

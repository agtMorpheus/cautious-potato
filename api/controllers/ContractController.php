<?php
/**
 * Contract Controller (Phase 5)
 * 
 * Handles contract CRUD operations:
 * - GET /api/contracts - List contracts (paginated, filtered)
 * - GET /api/contracts/:id - Get single contract
 * - POST /api/contracts - Create contract
 * - PUT /api/contracts/:id - Update contract
 * - DELETE /api/contracts/:id - Delete contract
 * - POST /api/contracts/bulk-update - Bulk update
 * - POST /api/contracts/export - Export contracts
 */

class ContractController {
    /**
     * GET /api/contracts
     * List all contracts with pagination, filtering, and sorting
     */
    public function list() {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? DEFAULT_PAGE_SIZE)));
        $offset = ($page - 1) * $limit;
        
        $status = sanitize($_GET['status'] ?? null);
        $search = sanitize($_GET['search'] ?? null);
        $sort = sanitize($_GET['sort'] ?? 'created_at');
        $dir = strtoupper($_GET['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        
        // Validate sort field
        $allowedSorts = ['created_at', 'updated_at', 'auftrag', 'titel', 'status', 'sollstart'];
        if (!in_array($sort, $allowedSorts)) {
            $sort = 'created_at';
        }
        
        try {
            $pdo = db();
            
            // Build query
            $where = [];
            $params = [];
            
            if ($status && in_array($status, ['offen', 'inbearb', 'fertig'])) {
                $where[] = 'status = ?';
                $params[] = $status;
            }
            
            if ($search) {
                $where[] = '(auftrag LIKE ? OR titel LIKE ? OR standort LIKE ? OR anlage_nr LIKE ?)';
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam]);
            }
            
            $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
            
            // Get total count
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM contracts $whereClause");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();
            
            // Get contracts
            $sql = "SELECT * FROM contracts $whereClause ORDER BY $sort $dir LIMIT ? OFFSET ?";
            $stmt = $pdo->prepare($sql);
            $params[] = $limit;
            $params[] = $offset;
            $stmt->execute($params);
            $contracts = $stmt->fetchAll();
            
            jsonResponse([
                'contracts' => $contracts,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            
        } catch (Exception $e) {
            Logger::error('Failed to list contracts', ['error' => $e->getMessage()]);
            errorResponse('Failed to fetch contracts', 500, 'fetch_error');
        }
    }
    
    /**
     * GET /api/contracts/:id
     * Get single contract with history
     */
    public function get($id) {
        try {
            $pdo = db();
            
            // Get contract
            $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
            $stmt->execute([$id]);
            $contract = $stmt->fetch();
            
            if (!$contract) {
                errorResponse('Contract not found', 404, 'not_found');
            }
            
            // Get change history
            $historyStmt = $pdo->prepare('
                SELECT ch.*, u.username as changed_by_username
                FROM contract_history ch
                LEFT JOIN users u ON ch.changed_by = u.id
                WHERE ch.contract_id = ?
                ORDER BY ch.changed_at DESC
                LIMIT 50
            ');
            $historyStmt->execute([$id]);
            $contract['history'] = $historyStmt->fetchAll();
            
            jsonResponse($contract);
            
        } catch (Exception $e) {
            Logger::error('Failed to get contract', ['id' => $id, 'error' => $e->getMessage()]);
            errorResponse('Failed to fetch contract', 500, 'fetch_error');
        }
    }
    
    /**
     * POST /api/contracts
     * Create a new contract
     */
    public function create() {
        $data = getJsonBody();
        
        // Validate required fields
        if (empty($data['auftrag'])) {
            errorResponse('Auftrag (contract ID) is required', 400, 'missing_field');
        }
        if (empty($data['titel'])) {
            errorResponse('Titel (title) is required', 400, 'missing_field');
        }
        
        // Validate status
        $status = $data['status'] ?? 'offen';
        if (!in_array($status, ['offen', 'inbearb', 'fertig'])) {
            errorResponse('Invalid status value', 400, 'invalid_status');
        }
        
        try {
            $pdo = db();
            
            // Check for duplicate auftrag
            $checkStmt = $pdo->prepare('SELECT id FROM contracts WHERE auftrag = ?');
            $checkStmt->execute([sanitize($data['auftrag'])]);
            if ($checkStmt->fetch()) {
                errorResponse('Contract with this Auftrag already exists', 409, 'duplicate_entry');
            }
            
            // Generate UUID if not provided
            $id = $data['id'] ?? generateUUID();
            
            $stmt = $pdo->prepare('
                INSERT INTO contracts (
                    id, auftrag, titel, standort, saeule_raum, anlage_nr,
                    beschreibung, status, sollstart, workorder_code,
                    melder, seriennummer, is_complete, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            
            $stmt->execute([
                $id,
                sanitize($data['auftrag']),
                sanitize($data['titel']),
                sanitize($data['standort'] ?? null),
                sanitize($data['saeule_raum'] ?? null),
                sanitize($data['anlage_nr'] ?? null),
                sanitize($data['beschreibung'] ?? null),
                $status,
                $data['sollstart'] ?? null,
                sanitize($data['workorder_code'] ?? null),
                sanitize($data['melder'] ?? null),
                sanitize($data['seriennummer'] ?? null),
                $data['is_complete'] ?? false,
                Auth::userId(),
                Auth::userId()
            ]);
            
            // Fetch created contract
            $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
            $stmt->execute([$id]);
            $contract = $stmt->fetch();
            
            Logger::info('Contract created', ['contract_id' => $id, 'auftrag' => $data['auftrag']]);
            
            jsonResponse($contract, 201);
            
        } catch (Exception $e) {
            Logger::error('Failed to create contract', ['error' => $e->getMessage()]);
            errorResponse('Failed to create contract', 500, 'create_error');
        }
    }
    
    /**
     * PUT /api/contracts/:id
     * Update an existing contract
     */
    public function update($id) {
        $data = getJsonBody();
        
        try {
            $pdo = db();
            
            // Get existing contract
            $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
            $stmt->execute([$id]);
            $contract = $stmt->fetch();
            
            if (!$contract) {
                errorResponse('Contract not found', 404, 'not_found');
            }
            
            // Allowed fields to update
            $allowed = ['titel', 'status', 'standort', 'saeule_raum', 'anlage_nr', 
                       'beschreibung', 'sollstart', 'workorder_code', 'melder', 
                       'seriennummer', 'is_complete'];
            
            $updates = [];
            $params = [];
            
            foreach ($allowed as $field) {
                if (array_key_exists($field, $data)) {
                    // Validate status
                    if ($field === 'status' && !in_array($data[$field], ['offen', 'inbearb', 'fertig'])) {
                        errorResponse('Invalid status value', 400, 'invalid_status');
                    }
                    
                    $oldValue = $contract[$field];
                    $newValue = $field === 'is_complete' ? (bool)$data[$field] : sanitize($data[$field]);
                    
                    // Track change in history
                    if ($oldValue != $newValue) {
                        $this->trackChange($id, $field, $oldValue, $newValue);
                    }
                    
                    $updates[] = "$field = ?";
                    $params[] = $newValue;
                }
            }
            
            if (empty($updates)) {
                jsonResponse($contract);
                return;
            }
            
            // Add updated_by
            $updates[] = 'updated_by = ?';
            $params[] = Auth::userId();
            $params[] = $id;
            
            $sql = 'UPDATE contracts SET ' . implode(', ', $updates) . ' WHERE id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            // Fetch updated contract
            $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
            $stmt->execute([$id]);
            $updated = $stmt->fetch();
            
            Logger::info('Contract updated', ['contract_id' => $id]);
            
            jsonResponse($updated);
            
        } catch (Exception $e) {
            Logger::error('Failed to update contract', ['id' => $id, 'error' => $e->getMessage()]);
            errorResponse('Failed to update contract', 500, 'update_error');
        }
    }
    
    /**
     * DELETE /api/contracts/:id
     * Delete a contract (admin only)
     */
    public function delete($id) {
        try {
            $pdo = db();
            
            // Check if contract exists
            $stmt = $pdo->prepare('SELECT auftrag FROM contracts WHERE id = ?');
            $stmt->execute([$id]);
            $contract = $stmt->fetch();
            
            if (!$contract) {
                errorResponse('Contract not found', 404, 'not_found');
            }
            
            // Delete contract (history will cascade)
            $stmt = $pdo->prepare('DELETE FROM contracts WHERE id = ?');
            $stmt->execute([$id]);
            
            Logger::info('Contract deleted', [
                'contract_id' => $id,
                'auftrag' => $contract['auftrag'],
                'deleted_by' => Auth::userId()
            ]);
            
            jsonResponse(['deleted' => true]);
            
        } catch (Exception $e) {
            Logger::error('Failed to delete contract', ['id' => $id, 'error' => $e->getMessage()]);
            errorResponse('Failed to delete contract', 500, 'delete_error');
        }
    }
    
    /**
     * POST /api/contracts/bulk-update
     * Update multiple contracts at once
     */
    public function bulkUpdate() {
        // Require manager role
        Auth::requireRole(['manager', 'admin']);
        
        $data = getJsonBody();
        
        $contractIds = $data['contract_ids'] ?? [];
        $updates = $data['updates'] ?? [];
        
        if (empty($contractIds)) {
            errorResponse('Contract IDs required', 400, 'missing_field');
        }
        if (empty($updates)) {
            errorResponse('Updates required', 400, 'missing_field');
        }
        
        // Validate status if being updated
        if (isset($updates['status']) && !in_array($updates['status'], ['offen', 'inbearb', 'fertig'])) {
            errorResponse('Invalid status value', 400, 'invalid_status');
        }
        
        $affected = 0;
        $errors = [];
        
        foreach ($contractIds as $id) {
            try {
                $this->updateSingle($id, $updates);
                $affected++;
            } catch (Exception $e) {
                $errors[] = ['id' => $id, 'error' => $e->getMessage()];
                Logger::warning('Bulk update failed for contract', ['id' => $id, 'error' => $e->getMessage()]);
            }
        }
        
        Logger::info('Bulk update completed', [
            'affected' => $affected,
            'total' => count($contractIds),
            'errors' => count($errors)
        ]);
        
        jsonResponse([
            'affected' => $affected,
            'total' => count($contractIds),
            'errors' => $errors
        ]);
    }
    
    /**
     * POST /api/contracts/export
     * Export contracts to CSV
     */
    public function export() {
        $data = getJsonBody();
        $format = $data['format'] ?? 'csv';
        
        // For now, only CSV is supported
        if ($format !== 'csv') {
            errorResponse('Only CSV format is supported', 400, 'unsupported_format');
        }
        
        try {
            $pdo = db();
            
            // Build query with same filters as list
            $status = sanitize($data['status'] ?? null);
            $search = sanitize($data['search'] ?? null);
            
            $where = [];
            $params = [];
            
            if ($status && in_array($status, ['offen', 'inbearb', 'fertig'])) {
                $where[] = 'status = ?';
                $params[] = $status;
            }
            
            if ($search) {
                $where[] = '(auftrag LIKE ? OR titel LIKE ?)';
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam]);
            }
            
            $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
            
            $stmt = $pdo->prepare("SELECT * FROM contracts $whereClause ORDER BY created_at DESC");
            $stmt->execute($params);
            $contracts = $stmt->fetchAll();
            
            // Generate CSV
            $filename = 'contracts_' . date('Y-m-d_His') . '.csv';
            $filepath = sys_get_temp_dir() . '/' . $filename;
            
            $fp = fopen($filepath, 'w');
            
            // Write BOM for Excel compatibility
            fwrite($fp, "\xEF\xBB\xBF");
            
            // Headers
            fputcsv($fp, ['Auftrag', 'Titel', 'Standort', 'Säule/Raum', 'Anlage-Nr.', 'Status', 'Sollstart', 'Erstellt am']);
            
            // Data
            foreach ($contracts as $c) {
                fputcsv($fp, [
                    $c['auftrag'],
                    $c['titel'],
                    $c['standort'],
                    $c['saeule_raum'],
                    $c['anlage_nr'],
                    $c['status'],
                    $c['sollstart'],
                    $c['created_at']
                ]);
            }
            
            fclose($fp);
            
            // Read file and return as base64 (for simple download)
            $content = base64_encode(file_get_contents($filepath));
            unlink($filepath);
            
            Logger::info('Contracts exported', ['count' => count($contracts), 'format' => $format]);
            
            jsonResponse([
                'filename' => $filename,
                'content' => $content,
                'count' => count($contracts),
                'format' => 'csv'
            ]);
            
        } catch (Exception $e) {
            Logger::error('Export failed', ['error' => $e->getMessage()]);
            errorResponse('Export failed', 500, 'export_error');
        }
    }
    
    /**
     * Track field change in history
     */
    private function trackChange($contractId, $field, $oldValue, $newValue) {
        try {
            $pdo = db();
            $stmt = $pdo->prepare('
                INSERT INTO contract_history (contract_id, field_name, old_value, new_value, changed_by)
                VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $contractId,
                $field,
                $oldValue,
                $newValue,
                Auth::userId()
            ]);
        } catch (Exception $e) {
            Logger::warning('Failed to track change', ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * Update a single contract (used by bulk update)
     */
    private function updateSingle($id, $updates) {
        $pdo = db();
        
        // Allowed fields
        $allowed = ['titel', 'status', 'standort', 'saeule_raum', 'anlage_nr', 'is_complete'];
        
        $setClauses = [];
        $params = [];
        
        foreach ($allowed as $field) {
            if (array_key_exists($field, $updates)) {
                $setClauses[] = "$field = ?";
                $params[] = sanitize($updates[$field]);
            }
        }
        
        if (empty($setClauses)) {
            return;
        }
        
        $setClauses[] = 'updated_by = ?';
        $params[] = Auth::userId();
        $params[] = $id;
        
        $sql = 'UPDATE contracts SET ' . implode(', ', $setClauses) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
}

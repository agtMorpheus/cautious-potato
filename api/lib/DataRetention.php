<?php
/**
 * Data Retention Manager (Phase 6)
 * 
 * Handles data archival, retention policies, and compliance requirements.
 * Supports GDPR data access and deletion requests.
 */

class DataRetention {
    
    /**
     * Default retention period in days (7 years for contracts)
     */
    const DEFAULT_RETENTION_DAYS = 365 * 7;
    
    /**
     * Log retention periods by level
     */
    const LOG_RETENTION = [
        'debug' => 30,      // 30 days
        'info' => 90,       // 90 days
        'warning' => 180,   // 6 months
        'error' => 365      // 1 year
    ];
    
    /**
     * @var PDO|null
     */
    private static $pdo;

    /**
     * Set database connection (for testing)
     * @param PDO $pdo
     */
    public static function setPdo($pdo) {
        self::$pdo = $pdo;
    }

    /**
     * Get database connection
     * @return PDO
     */
    private static function getPdo() {
        return self::$pdo ?? db();
    }

    /**
     * Archive old contracts based on retention policy
     * 
     * @param int|null $tenantId Optional tenant filter
     * @param int|null $retentionDays Custom retention period
     * @return array Archive results
     */
    public static function archiveOldContracts($tenantId = null, $retentionDays = null) {
        $retentionDays = $retentionDays ?? self::DEFAULT_RETENTION_DAYS;
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$retentionDays} days"));
        
        $pdo = self::getPdo();
        $archived = 0;
        $errors = [];
        
        // Find contracts to archive
        $sql = '
            SELECT c.* FROM contracts c
            WHERE c.status = "fertig"
            AND c.updated_at < ?
        ';
        $params = [$cutoffDate];
        
        if ($tenantId) {
            $sql .= ' AND c.tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $contracts = $stmt->fetchAll();
        
        foreach ($contracts as $contract) {
            try {
                self::archiveContract($contract['id']);
                $archived++;
            } catch (Exception $e) {
                $errors[] = [
                    'contract_id' => $contract['id'],
                    'error' => $e->getMessage()
                ];
            }
        }
        
        Logger::info('Contract archival completed', [
            'archived' => $archived,
            'errors' => count($errors),
            'cutoff_date' => $cutoffDate
        ]);
        
        return [
            'archived' => $archived,
            'errors' => $errors,
            'cutoff_date' => $cutoffDate
        ];
    }
    
    /**
     * Archive a single contract
     * 
     * @param string $contractId Contract UUID
     * @param int|null $userId User performing archive
     * @param string $reason Archive reason
     * @return bool Success
     */
    public static function archiveContract($contractId, $userId = null, $reason = 'retention_policy') {
        $pdo = self::getPdo();
        
        // Get contract data
        $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
        $stmt->execute([$contractId]);
        $contract = $stmt->fetch();
        
        if (!$contract) {
            throw new Exception('Contract not found');
        }
        
        // Get associated history
        $stmt = $pdo->prepare('SELECT * FROM contract_history WHERE contract_id = ?');
        $stmt->execute([$contractId]);
        $history = $stmt->fetchAll();
        
        $pdo->beginTransaction();
        
        try {
            // Create archive record
            $stmt = $pdo->prepare('
                INSERT INTO contract_archives 
                (original_id, tenant_id, contract_data, history_data, archived_by, reason, retention_until)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ');
            
            $retentionUntil = date('Y-m-d', strtotime('+7 years'));
            
            $stmt->execute([
                $contract['id'],
                $contract['tenant_id'],
                json_encode($contract),
                json_encode($history),
                $userId,
                $reason,
                $retentionUntil
            ]);
            
            // Delete original contract (cascades to history, approvals, etc.)
            $stmt = $pdo->prepare('DELETE FROM contracts WHERE id = ?');
            $stmt->execute([$contractId]);
            
            $pdo->commit();
            
            Logger::info('Contract archived', [
                'contract_id' => $contractId,
                'auftrag' => $contract['auftrag'],
                'reason' => $reason
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * Restore an archived contract
     * 
     * @param int $archiveId Archive record ID
     * @param int|null $userId User performing restore
     * @return string Restored contract ID
     */
    public static function restoreContract($archiveId, $userId = null) {
        $pdo = self::getPdo();
        
        // Get archive record
        $stmt = $pdo->prepare('SELECT * FROM contract_archives WHERE id = ?');
        $stmt->execute([$archiveId]);
        $archive = $stmt->fetch();
        
        if (!$archive) {
            throw new Exception('Archive record not found');
        }
        
        $contractData = json_decode($archive['contract_data'], true);
        $historyData = json_decode($archive['history_data'], true);
        
        $pdo->beginTransaction();
        
        try {
            // Check if contract ID already exists
            $stmt = $pdo->prepare('SELECT id FROM contracts WHERE id = ?');
            $stmt->execute([$contractData['id']]);
            
            if ($stmt->fetch()) {
                throw new Exception('Contract with this ID already exists');
            }
            
            // Restore contract
            $columns = array_keys($contractData);
            $placeholders = array_fill(0, count($columns), '?');
            
            $sql = 'INSERT INTO contracts (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')';
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_values($contractData));
            
            // Restore history
            if (!empty($historyData)) {
                foreach ($historyData as $historyRecord) {
                    $stmt = $pdo->prepare('
                        INSERT INTO contract_history (contract_id, field_name, old_value, new_value, changed_by, changed_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ');
                    $stmt->execute([
                        $historyRecord['contract_id'],
                        $historyRecord['field_name'],
                        $historyRecord['old_value'],
                        $historyRecord['new_value'],
                        $historyRecord['changed_by'],
                        $historyRecord['changed_at']
                    ]);
                }
            }
            
            // Add restoration to history
            $stmt = $pdo->prepare('
                INSERT INTO contract_history (contract_id, field_name, old_value, new_value, changed_by)
                VALUES (?, "_restored", "archived", "active", ?)
            ');
            $stmt->execute([$contractData['id'], $userId]);
            
            // Delete archive record
            $stmt = $pdo->prepare('DELETE FROM contract_archives WHERE id = ?');
            $stmt->execute([$archiveId]);
            
            $pdo->commit();
            
            Logger::info('Contract restored from archive', [
                'contract_id' => $contractData['id'],
                'archive_id' => $archiveId
            ]);
            
            return $contractData['id'];
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * Clean up old logs based on retention policy
     * 
     * @return array Cleanup results
     */
    public static function pruneLogs() {
        $pdo = self::getPdo();
        $deleted = [];
        
        foreach (self::LOG_RETENTION as $level => $days) {
            $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$days} days"));
            
            $stmt = $pdo->prepare('
                DELETE FROM logs 
                WHERE log_level = ? AND created_at < ?
            ');
            $stmt->execute([$level, $cutoffDate]);
            
            $deleted[$level] = $stmt->rowCount();
        }
        
        $total = array_sum($deleted);
        
        Logger::info('Log pruning completed', [
            'deleted' => $deleted,
            'total' => $total
        ]);
        
        return [
            'deleted' => $deleted,
            'total' => $total
        ];
    }
    
    /**
     * Generate data retention report
     * 
     * @param int|null $tenantId Optional tenant filter
     * @return array Retention report
     */
    public static function getRetentionReport($tenantId = null) {
        $pdo = self::getPdo();
        $report = [];
        
        // Active contracts
        $sql = 'SELECT COUNT(*) as count FROM contracts';
        $params = [];
        if ($tenantId) {
            $sql .= ' WHERE tenant_id = ?';
            $params[] = $tenantId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $report['active_contracts'] = (int)$stmt->fetchColumn();
        
        // Archived contracts
        $sql = 'SELECT COUNT(*) as count FROM contract_archives';
        $params = [];
        if ($tenantId) {
            $sql .= ' WHERE tenant_id = ?';
            $params[] = $tenantId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $report['archived_contracts'] = (int)$stmt->fetchColumn();
        
        // Contracts exceeding retention
        $cutoffDate = date('Y-m-d', strtotime('-' . self::DEFAULT_RETENTION_DAYS . ' days'));
        $sql = 'SELECT COUNT(*) as count FROM contracts WHERE status = "fertig" AND updated_at < ?';
        $params = [$cutoffDate];
        if ($tenantId) {
            $sql .= ' AND tenant_id = ?';
            $params[] = $tenantId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $report['contracts_exceeding_retention'] = (int)$stmt->fetchColumn();
        
        // Audit trail entries
        $stmt = $pdo->query('SELECT COUNT(*) as count FROM contract_history');
        $report['audit_trail_entries'] = (int)$stmt->fetchColumn();
        
        // Pending deletion requests
        $stmt = $pdo->query('SELECT COUNT(*) as count FROM deletion_requests WHERE status = "pending"');
        $report['pending_deletion_requests'] = (int)$stmt->fetchColumn();
        
        $report['retention_policy_days'] = self::DEFAULT_RETENTION_DAYS;
        $report['generated_at'] = date('Y-m-d H:i:s');
        
        return $report;
    }
    
    /**
     * Create a deletion request (GDPR right to be forgotten)
     * 
     * @param string $requestType Type: 'user_data', 'contract', 'all_data'
     * @param string|null $targetId Target user or contract ID
     * @param int $requestedBy User ID making the request
     * @param string|null $reason Reason for deletion
     * @param int|null $tenantId Tenant ID
     * @return int Deletion request ID
     */
    public static function createDeletionRequest($requestType, $targetId, $requestedBy, $reason = null, $tenantId = null) {
        $pdo = self::getPdo();
        
        $stmt = $pdo->prepare('
            INSERT INTO deletion_requests 
            (tenant_id, requested_by, request_type, target_id, reason)
            VALUES (?, ?, ?, ?, ?)
        ');
        
        $stmt->execute([
            $tenantId,
            $requestedBy,
            $requestType,
            $targetId,
            $reason
        ]);
        
        $requestId = $pdo->lastInsertId();
        
        Logger::info('Deletion request created', [
            'request_id' => $requestId,
            'type' => $requestType,
            'target_id' => $targetId,
            'requested_by' => $requestedBy
        ]);
        
        return $requestId;
    }
    
    /**
     * Process a deletion request
     * 
     * @param int $requestId Deletion request ID
     * @param int $processedBy User ID processing the request
     * @param bool $approve True to approve and execute, false to reject
     * @return bool Success
     */
    public static function processDeletionRequest($requestId, $processedBy, $approve = true) {
        $pdo = self::getPdo();
        
        // Get request
        $stmt = $pdo->prepare('SELECT * FROM deletion_requests WHERE id = ? AND status = "pending"');
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();
        
        if (!$request) {
            throw new Exception('Deletion request not found or already processed');
        }
        
        $pdo->beginTransaction();
        
        try {
            if ($approve) {
                // Execute deletion based on type
                switch ($request['request_type']) {
                    case 'contract':
                        self::deleteContractData($request['target_id']);
                        break;
                    case 'user_data':
                        self::deleteUserData($request['target_id']);
                        break;
                    case 'all_data':
                        self::deleteAllUserData($request['target_id']);
                        break;
                }
                
                $status = 'completed';
            } else {
                $status = 'rejected';
            }
            
            // Update request status
            $stmt = $pdo->prepare('
                UPDATE deletion_requests 
                SET status = ?, processed_by = ?, processed_at = NOW()
                WHERE id = ?
            ');
            $stmt->execute([$status, $processedBy, $requestId]);
            
            $pdo->commit();
            
            Logger::info('Deletion request processed', [
                'request_id' => $requestId,
                'status' => $status,
                'processed_by' => $processedBy
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * Delete contract data (anonymize rather than hard delete)
     */
    private static function deleteContractData($contractId) {
        $pdo = self::getPdo();
        
        // Archive first
        self::archiveContract($contractId, null, 'data_request');
    }
    
    /**
     * Delete user's personal data from contracts
     */
    private static function deleteUserData($userId) {
        $pdo = self::getPdo();
        
        // Anonymize user references in contracts
        $stmt = $pdo->prepare('
            UPDATE contracts 
            SET melder = "[DELETED]"
            WHERE created_by = ? OR updated_by = ?
        ');
        $stmt->execute([$userId, $userId]);
        
        // Remove user from history (keep audit trail but anonymize)
        $stmt = $pdo->prepare('
            UPDATE contract_history 
            SET changed_by = NULL
            WHERE changed_by = ?
        ');
        $stmt->execute([$userId]);
    }
    
    /**
     * Delete all data associated with a user
     */
    private static function deleteAllUserData($userId) {
        self::deleteUserData($userId);
        
        $pdo = self::getPdo();
        
        // Deactivate user account
        $stmt = $pdo->prepare('
            UPDATE users 
            SET is_active = FALSE, 
                username = CONCAT("[DELETED]_", id),
                email = CONCAT("deleted_", id, "@deleted.local"),
                password_hash = ""
            WHERE id = ?
        ');
        $stmt->execute([$userId]);
    }
    
    /**
     * Generate GDPR compliance report
     * 
     * @param int|null $tenantId Optional tenant filter
     * @return array Compliance report
     */
    public static function getComplianceReport($tenantId = null) {
        $pdo = self::getPdo();
        
        // Count users
        $stmt = $pdo->query('SELECT COUNT(*) FROM users');
        $totalUsers = (int)$stmt->fetchColumn();
        
        // Deletion requests
        $stmt = $pdo->query('
            SELECT status, COUNT(*) as count 
            FROM deletion_requests 
            GROUP BY status
        ');
        $deletionRequests = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // Security incidents
        $stmt = $pdo->query('
            SELECT severity, COUNT(*) as count 
            FROM security_incidents 
            GROUP BY severity
        ');
        $incidents = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        return [
            'data_processing' => [
                'total_personal_data_records' => $totalUsers,
                'deletion_requests' => $deletionRequests
            ],
            'security_incidents' => $incidents,
            'data_retention' => self::getRetentionReport($tenantId),
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Permanently delete expired archives
     * 
     * @return int Number of records deleted
     */
    public static function purgeExpiredArchives() {
        $pdo = self::getPdo();
        
        $stmt = $pdo->prepare('
            DELETE FROM contract_archives 
            WHERE retention_until < CURDATE()
        ');
        $stmt->execute();
        
        $deleted = $stmt->rowCount();
        
        if ($deleted > 0) {
            Logger::info('Expired archives purged', ['count' => $deleted]);
        }
        
        return $deleted;
    }
}

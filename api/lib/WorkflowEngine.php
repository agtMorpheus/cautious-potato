<?php
/**
 * Workflow Engine (Phase 6)
 * 
 * Manages contract lifecycle transitions, approvals, and notifications.
 * Implements state machine pattern for contract status management.
 */

class WorkflowEngine {
    
    /**
     * Define valid status transitions
     * Note: Base workflow uses 'offen', 'inbearb', 'fertig'.
     * The 'review', 'approved', 'rejected' statuses are managed via 
     * the approval_status field to maintain backward compatibility.
     * Format: 'current_status' => ['allowed_next_statuses']
     */
    private static $allowedTransitions = [
        'offen' => ['inbearb'],
        'inbearb' => ['offen', 'fertig'],  // Can go back to open or complete
        'fertig' => ['inbearb']  // Can reopen completed contracts
    ];
    
    /**
     * Status labels for display
     */
    private static $statusLabels = [
        'offen' => 'Open',
        'inbearb' => 'In Progress',
        'fertig' => 'Completed'
    ];
    
    /**
     * Transition contract to a new status
     * 
     * @param string $contractId Contract UUID
     * @param string $newStatus Target status
     * @param int|null $userId User performing the transition
     * @param string|null $reason Reason for transition
     * @return array Updated contract data
     * @throws Exception If transition is not allowed
     */
    public static function transitionContract($contractId, $newStatus, $userId = null, $reason = null) {
        $pdo = db();
        
        // Get current contract
        $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
        $stmt->execute([$contractId]);
        $contract = $stmt->fetch();
        
        if (!$contract) {
            throw new Exception('Contract not found');
        }
        
        $currentStatus = $contract['status'];
        
        // Validate transition
        if (!self::isValidTransition($currentStatus, $newStatus)) {
            throw new Exception("Invalid transition: {$currentStatus} → {$newStatus}");
        }
        
        // Special validation for certain transitions
        if ($newStatus === 'fertig') {
            self::validateCompletionRequirements($contractId);
        }
        
        // Perform transition
        $pdo->beginTransaction();
        
        try {
            // Update contract status
            $stmt = $pdo->prepare('
                UPDATE contracts 
                SET status = ?, updated_by = ?, updated_at = NOW()
                WHERE id = ?
            ');
            $stmt->execute([$newStatus, $userId, $contractId]);
            
            // Log transition
            $stmt = $pdo->prepare('
                INSERT INTO workflow_transitions 
                (contract_id, from_status, to_status, transition_by, reason)
                VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([$contractId, $currentStatus, $newStatus, $userId, $reason]);
            
            // Record in history
            $stmt = $pdo->prepare('
                INSERT INTO contract_history 
                (contract_id, field_name, old_value, new_value, changed_by)
                VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([$contractId, 'status', $currentStatus, $newStatus, $userId]);
            
            $pdo->commit();
            
            // Log the transition
            Logger::info('Workflow transition', [
                'contract_id' => $contractId,
                'from' => $currentStatus,
                'to' => $newStatus,
                'user_id' => $userId
            ]);
            
            // Send notifications
            self::sendTransitionNotifications($contractId, $currentStatus, $newStatus);
            
            // Return updated contract
            $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
            $stmt->execute([$contractId]);
            return $stmt->fetch();
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * Check if a transition is valid
     * 
     * @param string $from Current status
     * @param string $to Target status
     * @return bool
     */
    public static function isValidTransition($from, $to) {
        $allowed = self::$allowedTransitions[$from] ?? [];
        return in_array($to, $allowed);
    }
    
    /**
     * Get allowed transitions for a status
     * 
     * @param string $status Current status
     * @return array List of allowed next statuses
     */
    public static function getAllowedTransitions($status) {
        return self::$allowedTransitions[$status] ?? [];
    }
    
    /**
     * Request approval for a contract
     * 
     * @param string $contractId Contract UUID
     * @param int $approverId User ID of approver
     * @param int|null $requesterId User ID making the request
     * @param string|null $note Optional note for approver
     * @return array Created approval record
     */
    public static function requestApproval($contractId, $approverId, $requesterId = null, $note = null) {
        $pdo = db();
        
        // Check if contract exists and is in correct state
        $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
        $stmt->execute([$contractId]);
        $contract = $stmt->fetch();
        
        if (!$contract) {
            throw new Exception('Contract not found');
        }
        
        if ($contract['status'] !== 'inbearb') {
            throw new Exception('Contract must be in progress to request approval');
        }
        
        // Check for existing pending approval
        $stmt = $pdo->prepare('
            SELECT id FROM contract_approvals 
            WHERE contract_id = ? AND status = "pending"
        ');
        $stmt->execute([$contractId]);
        if ($stmt->fetch()) {
            throw new Exception('Contract already has a pending approval request');
        }
        
        // Create approval request (status stays as inbearb, approval_status tracks approval)
        $stmt = $pdo->prepare('
            INSERT INTO contract_approvals 
            (contract_id, approver_id, requested_by, comments)
            VALUES (?, ?, ?, ?)
        ');
        $stmt->execute([$contractId, $approverId, $requesterId, $note]);
        
        $approvalId = $pdo->lastInsertId();
        
        // Update contract approval fields (main status unchanged)
        $stmt = $pdo->prepare('
            UPDATE contracts SET approver_id = ?, approval_status = "pending"
            WHERE id = ?
        ');
        $stmt->execute([$approverId, $contractId]);
        
        // Log the approval request in workflow transitions
        $stmt = $pdo->prepare('
            INSERT INTO workflow_transitions 
            (contract_id, from_status, to_status, transition_by, reason)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([$contractId, 'approval:none', 'approval:pending', $requesterId, 'Approval requested']);
        
        // Send notification to approver
        self::createNotification(
            $approverId,
            'approval_request',
            'Approval Required',
            "Contract {$contract['auftrag']} requires your approval",
            'contract',
            $contractId
        );
        
        // Get approver info for email
        $stmt = $pdo->prepare('SELECT email, username FROM users WHERE id = ?');
        $stmt->execute([$approverId]);
        $approver = $stmt->fetch();
        
        if ($approver) {
            Logger::info('Approval requested', [
                'contract_id' => $contractId,
                'approver' => $approver['username'],
                'requester_id' => $requesterId
            ]);
        }
        
        return [
            'id' => $approvalId,
            'contract_id' => $contractId,
            'approver_id' => $approverId,
            'status' => 'pending'
        ];
    }
    
    /**
     * Approve or reject a contract
     * 
     * @param string $contractId Contract UUID
     * @param int $approverId User ID of approver
     * @param bool $approved True to approve, false to reject
     * @param string|null $comments Approval/rejection comments
     * @return array Updated approval record
     */
    public static function processApproval($contractId, $approverId, $approved, $comments = null) {
        $pdo = db();
        
        // Get pending approval
        $stmt = $pdo->prepare('
            SELECT * FROM contract_approvals 
            WHERE contract_id = ? AND approver_id = ? AND status = "pending"
        ');
        $stmt->execute([$contractId, $approverId]);
        $approval = $stmt->fetch();
        
        if (!$approval) {
            throw new Exception('No pending approval found for this approver');
        }
        
        $newApprovalStatus = $approved ? 'approved' : 'rejected';
        
        $pdo->beginTransaction();
        
        try {
            // Update approval record
            $stmt = $pdo->prepare('
                UPDATE contract_approvals 
                SET status = ?, comments = ?, action_date = NOW()
                WHERE id = ?
            ');
            $stmt->execute([$newApprovalStatus, $comments, $approval['id']]);
            
            // Update contract approval_status only (main status unchanged)
            $stmt = $pdo->prepare('
                UPDATE contracts 
                SET approval_status = ?, approval_date = NOW()
                WHERE id = ?
            ');
            $stmt->execute([$newApprovalStatus, $contractId]);
            
            // Log transition
            $stmt = $pdo->prepare('
                INSERT INTO workflow_transitions 
                (contract_id, from_status, to_status, transition_by, reason)
                VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $contractId, 
                'approval:pending', 
                'approval:' . $newApprovalStatus, 
                $approverId, 
                ($approved ? 'Approved' : 'Rejected') . ($comments ? ": $comments" : '')
            ]);
            
            $pdo->commit();
            
            Logger::info('Approval processed', [
                'contract_id' => $contractId,
                'approver_id' => $approverId,
                'decision' => $newApprovalStatus,
                'comments' => $comments
            ]);
            
            // Notify requester
            if ($approval['requested_by']) {
                self::createNotification(
                    $approval['requested_by'],
                    $approved ? 'approval_granted' : 'approval_rejected',
                    $approved ? 'Contract Approved' : 'Contract Rejected',
                    "Your contract has been " . ($approved ? 'approved' : 'rejected') . ($comments ? ": $comments" : ''),
                    'contract',
                    $contractId
                );
            }
            
            return [
                'id' => $approval['id'],
                'contract_id' => $contractId,
                'status' => $newApprovalStatus,
                'decision_date' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * Get pending approvals for a user
     * 
     * @param int $userId Approver user ID
     * @return array List of pending approvals with contract details
     */
    public static function getPendingApprovals($userId) {
        $pdo = db();
        
        $stmt = $pdo->prepare('
            SELECT 
                ca.*,
                c.auftrag,
                c.titel,
                c.standort,
                c.status as contract_status,
                u.username as requested_by_username
            FROM contract_approvals ca
            JOIN contracts c ON ca.contract_id = c.id
            LEFT JOIN users u ON ca.requested_by = u.id
            WHERE ca.approver_id = ? AND ca.status = "pending"
            ORDER BY ca.requested_at DESC
        ');
        $stmt->execute([$userId]);
        
        return $stmt->fetchAll();
    }
    
    /**
     * Validate requirements before completing a contract
     * 
     * @param string $contractId Contract UUID
     * @throws Exception If requirements not met
     */
    private static function validateCompletionRequirements($contractId) {
        $pdo = db();
        
        // Check for pending approvals
        $stmt = $pdo->prepare('
            SELECT COUNT(*) as pending_count 
            FROM contract_approvals 
            WHERE contract_id = ? AND status = "pending"
        ');
        $stmt->execute([$contractId]);
        $result = $stmt->fetch();
        
        if ($result['pending_count'] > 0) {
            throw new Exception('Cannot complete contract with pending approvals');
        }
        
        // Check if contract was approved (if approval was required)
        $stmt = $pdo->prepare('SELECT approval_status FROM contracts WHERE id = ?');
        $stmt->execute([$contractId]);
        $contract = $stmt->fetch();
        
        // If there was ever an approval request, it must be approved
        $stmt = $pdo->prepare('
            SELECT COUNT(*) as approval_count 
            FROM contract_approvals 
            WHERE contract_id = ?
        ');
        $stmt->execute([$contractId]);
        $approvalResult = $stmt->fetch();
        
        if ($approvalResult['approval_count'] > 0 && $contract['approval_status'] !== 'approved') {
            throw new Exception('Contract must be approved before completion');
        }
    }
    
    /**
     * Send notifications for a status transition
     * 
     * @param string $contractId Contract UUID
     * @param string $fromStatus Previous status
     * @param string $toStatus New status
     */
    private static function sendTransitionNotifications($contractId, $fromStatus, $toStatus) {
        $pdo = db();
        
        // Get contract details
        $stmt = $pdo->prepare('
            SELECT c.*, u.username as assigned_username
            FROM contracts c
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE c.id = ?
        ');
        $stmt->execute([$contractId]);
        $contract = $stmt->fetch();
        
        if (!$contract) {
            return;
        }
        
        // Notify assigned user
        if ($contract['assigned_to']) {
            self::createNotification(
                $contract['assigned_to'],
                'contract_status_change',
                'Contract Status Changed',
                "Contract {$contract['auftrag']} moved from " . 
                    self::$statusLabels[$fromStatus] . " to " . 
                    self::$statusLabels[$toStatus],
                'contract',
                $contractId
            );
        }
    }
    
    /**
     * Create a notification record
     * 
     * @param int $userId Target user ID
     * @param string $type Notification type
     * @param string $title Notification title
     * @param string $message Notification message
     * @param string|null $resourceType Related resource type
     * @param string|null $resourceId Related resource ID
     */
    private static function createNotification($userId, $type, $title, $message, $resourceType = null, $resourceId = null) {
        try {
            $pdo = db();
            
            // Get user's tenant
            $stmt = $pdo->prepare('SELECT tenant_id FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            $stmt = $pdo->prepare('
                INSERT INTO notifications 
                (tenant_id, user_id, type, title, message, resource_type, resource_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $user['tenant_id'] ?? null,
                $userId,
                $type,
                $title,
                $message,
                $resourceType,
                $resourceId
            ]);
        } catch (Exception $e) {
            Logger::warning('Failed to create notification', ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * Get workflow history for a contract
     * 
     * @param string $contractId Contract UUID
     * @return array List of transitions
     */
    public static function getWorkflowHistory($contractId) {
        $pdo = db();
        
        $stmt = $pdo->prepare('
            SELECT 
                wt.*,
                u.username as transition_by_username
            FROM workflow_transitions wt
            LEFT JOIN users u ON wt.transition_by = u.id
            WHERE wt.contract_id = ?
            ORDER BY wt.transitioned_at DESC
        ');
        $stmt->execute([$contractId]);
        
        return $stmt->fetchAll();
    }
    
    /**
     * Get all status labels
     * 
     * @return array Status labels
     */
    public static function getStatusLabels() {
        return self::$statusLabels;
    }
}

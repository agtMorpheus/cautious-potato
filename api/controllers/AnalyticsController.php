<?php
/**
 * Analytics Controller (Phase 6)
 * 
 * Handles analytics dashboard data, metrics, and reporting endpoints:
 * - GET /api/analytics/dashboard - Get dashboard summary
 * - GET /api/analytics/trends - Get contract trends
 * - GET /api/analytics/bottlenecks - Get bottleneck analysis
 * - GET /api/analytics/sla-status - Get SLA status summary
 * - POST /api/analytics/calculate-metrics - Trigger metrics calculation
 */

class AnalyticsController {
    
    /**
     * GET /api/analytics/dashboard
     * Get comprehensive dashboard data
     */
    public function getDashboard() {
        $tenantId = $this->getTenantId();
        
        try {
            $pdo = db();
            
            // Get summary counts
            $summary = $this->getContractSummary($tenantId);
            
            // Get recent metrics (last 30 days)
            $metrics = $this->getRecentMetrics($tenantId, 30);
            
            // Get SLA status
            $slaStatus = $this->getSlaStatusSummary($tenantId);
            
            // Get recent activity
            $recentActivity = $this->getRecentActivity($tenantId, 20);
            
            // Get pending approvals count
            $pendingApprovals = $this->getPendingApprovalsCount($tenantId);
            
            jsonResponse([
                'summary' => $summary,
                'metrics' => $metrics,
                'sla_status' => $slaStatus,
                'recent_activity' => $recentActivity,
                'pending_approvals' => $pendingApprovals,
                'generated_at' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            Logger::error('Dashboard data fetch failed', ['error' => $e->getMessage()]);
            errorResponse('Failed to fetch dashboard data', 500, 'dashboard_error');
        }
    }
    
    /**
     * GET /api/analytics/trends
     * Get contract trends over time
     */
    public function getTrends() {
        $days = min(365, max(7, (int)($_GET['days'] ?? 30)));
        $tenantId = $this->getTenantId();
        
        try {
            $startDate = date('Y-m-d', strtotime("-{$days} days"));
            $pdo = db();
            
            // Get daily contract counts
            $sql = '
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as new_contracts,
                    SUM(CASE WHEN status = "offen" THEN 1 ELSE 0 END) as open_count,
                    SUM(CASE WHEN status = "inbearb" THEN 1 ELSE 0 END) as in_progress_count,
                    SUM(CASE WHEN status = "fertig" THEN 1 ELSE 0 END) as completed_count
                FROM contracts
                WHERE created_at >= ?
            ';
            $params = [$startDate];
            
            if ($tenantId) {
                $sql .= ' AND tenant_id = ?';
                $params[] = $tenantId;
            }
            
            $sql .= ' GROUP BY DATE(created_at) ORDER BY date ASC';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $dailyData = $stmt->fetchAll();
            
            // Get completion trend (contracts completed per day)
            $sql = '
                SELECT 
                    DATE(transitioned_at) as date,
                    COUNT(*) as completed_count
                FROM workflow_transitions wt
                JOIN contracts c ON wt.contract_id = c.id
                WHERE wt.to_status = "fertig"
                AND wt.transitioned_at >= ?
            ';
            $params = [$startDate];
            
            if ($tenantId) {
                $sql .= ' AND c.tenant_id = ?';
                $params[] = $tenantId;
            }
            
            $sql .= ' GROUP BY DATE(transitioned_at) ORDER BY date ASC';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $completionData = $stmt->fetchAll();
            
            // Calculate moving averages
            $movingAvg = $this->calculateMovingAverage($dailyData, 'new_contracts', 7);
            
            jsonResponse([
                'period' => "{$days} days",
                'start_date' => $startDate,
                'end_date' => date('Y-m-d'),
                'daily_data' => $dailyData,
                'completion_trend' => $completionData,
                'moving_average_7d' => $movingAvg
            ]);
            
        } catch (Exception $e) {
            Logger::error('Trends fetch failed', ['error' => $e->getMessage()]);
            errorResponse('Failed to fetch trends', 500, 'trends_error');
        }
    }
    
    /**
     * GET /api/analytics/bottlenecks
     * Identify contracts stuck in processing
     */
    public function getBottlenecks() {
        $tenantId = $this->getTenantId();
        $thresholdDays = (int)($_GET['threshold_days'] ?? 30);
        
        try {
            $pdo = db();
            
            // Contracts stuck in 'inbearb' for too long
            $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$thresholdDays} days"));
            
            $sql = '
                SELECT 
                    c.*,
                    DATEDIFF(NOW(), c.created_at) as days_in_status,
                    u.username as assigned_username
                FROM contracts c
                LEFT JOIN users u ON c.assigned_to = u.id
                WHERE c.status = "inbearb"
                AND c.created_at < ?
            ';
            $params = [$cutoffDate];
            
            if ($tenantId) {
                $sql .= ' AND c.tenant_id = ?';
                $params[] = $tenantId;
            }
            
            $sql .= ' ORDER BY c.created_at ASC LIMIT 50';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $stuckContracts = $stmt->fetchAll();
            
            // Contracts with pending approvals > 7 days
            $sql = '
                SELECT 
                    c.id,
                    c.auftrag,
                    c.titel,
                    ca.requested_at,
                    DATEDIFF(NOW(), ca.requested_at) as days_pending,
                    u.username as approver_username
                FROM contract_approvals ca
                JOIN contracts c ON ca.contract_id = c.id
                JOIN users u ON ca.approver_id = u.id
                WHERE ca.status = "pending"
                AND ca.requested_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
            ';
            
            if ($tenantId) {
                $sql .= ' AND c.tenant_id = ?';
            }
            
            $sql .= ' ORDER BY ca.requested_at ASC';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($tenantId ? [$tenantId] : []);
            $pendingApprovals = $stmt->fetchAll();
            
            // Status distribution for bottleneck analysis
            $sql = '
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(DATEDIFF(NOW(), created_at)) as avg_age_days
                FROM contracts
            ';
            $params = [];
            
            if ($tenantId) {
                $sql .= ' WHERE tenant_id = ?';
                $params[] = $tenantId;
            }
            
            $sql .= ' GROUP BY status';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $statusDistribution = $stmt->fetchAll();
            
            jsonResponse([
                'stuck_contracts' => $stuckContracts,
                'stuck_count' => count($stuckContracts),
                'pending_approvals' => $pendingApprovals,
                'pending_approvals_count' => count($pendingApprovals),
                'status_distribution' => $statusDistribution,
                'threshold_days' => $thresholdDays
            ]);
            
        } catch (Exception $e) {
            Logger::error('Bottlenecks fetch failed', ['error' => $e->getMessage()]);
            errorResponse('Failed to fetch bottlenecks', 500, 'bottlenecks_error');
        }
    }
    
    /**
     * GET /api/analytics/sla-status
     * Get SLA status summary and at-risk contracts
     */
    public function getSlaStatus() {
        $tenantId = $this->getTenantId();
        
        try {
            $pdo = db();
            
            // SLA status summary
            $sql = '
                SELECT 
                    sla_type,
                    status,
                    COUNT(*) as count
                FROM contract_slas cs
                JOIN contracts c ON cs.contract_id = c.id
            ';
            $params = [];
            
            if ($tenantId) {
                $sql .= ' WHERE c.tenant_id = ?';
                $params[] = $tenantId;
            }
            
            $sql .= ' GROUP BY sla_type, status';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $summary = $stmt->fetchAll();
            
            // At-risk SLAs (due within 3 days)
            $sql = '
                SELECT 
                    cs.*,
                    c.auftrag,
                    c.titel,
                    DATEDIFF(cs.due_date, NOW()) as days_remaining
                FROM contract_slas cs
                JOIN contracts c ON cs.contract_id = c.id
                WHERE cs.status IN ("pending", "at_risk")
                AND cs.due_date <= DATE_ADD(NOW(), INTERVAL 3 DAY)
            ';
            
            if ($tenantId) {
                $sql .= ' AND c.tenant_id = ?';
            }
            
            $sql .= ' ORDER BY cs.due_date ASC';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($tenantId ? [$tenantId] : []);
            $atRisk = $stmt->fetchAll();
            
            // Breached SLAs
            $sql = '
                SELECT 
                    cs.*,
                    c.auftrag,
                    c.titel
                FROM contract_slas cs
                JOIN contracts c ON cs.contract_id = c.id
                WHERE cs.status = "breached"
            ';
            
            if ($tenantId) {
                $sql .= ' AND c.tenant_id = ?';
            }
            
            $sql .= ' ORDER BY cs.due_date DESC LIMIT 20';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($tenantId ? [$tenantId] : []);
            $breached = $stmt->fetchAll();
            
            jsonResponse([
                'summary' => $summary,
                'at_risk' => $atRisk,
                'at_risk_count' => count($atRisk),
                'breached' => $breached,
                'breached_count' => count($breached)
            ]);
            
        } catch (Exception $e) {
            Logger::error('SLA status fetch failed', ['error' => $e->getMessage()]);
            errorResponse('Failed to fetch SLA status', 500, 'sla_error');
        }
    }
    
    /**
     * POST /api/analytics/calculate-metrics
     * Trigger metrics calculation for a specific date
     */
    public function calculateMetrics() {
        Auth::requireRole(['manager', 'admin']);
        
        $data = getJsonBody();
        $date = $data['date'] ?? date('Y-m-d');
        $tenantId = $this->getTenantId();
        
        try {
            $pdo = db();
            
            // Calculate metrics
            $sql = '
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = "offen" THEN 1 ELSE 0 END) as open_count,
                    SUM(CASE WHEN status = "inbearb" THEN 1 ELSE 0 END) as inbearb_count,
                    SUM(CASE WHEN status = "fertig" THEN 1 ELSE 0 END) as fertig_count
                FROM contracts
            ';
            $params = [];
            
            if ($tenantId) {
                $sql .= ' WHERE tenant_id = ?';
                $params[] = $tenantId;
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $counts = $stmt->fetch();
            
            // Calculate completion rate
            $completionRate = $counts['total'] > 0 
                ? round(($counts['fertig_count'] / $counts['total']) * 100, 2) 
                : 0;
            
            // Count new contracts today
            $sql = 'SELECT COUNT(*) FROM contracts WHERE DATE(created_at) = ?';
            $params = [$date];
            if ($tenantId) {
                $sql .= ' AND tenant_id = ?';
                $params[] = $tenantId;
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $newToday = (int)$stmt->fetchColumn();
            
            // Count completed today
            $sql = '
                SELECT COUNT(*) FROM workflow_transitions wt
                JOIN contracts c ON wt.contract_id = c.id
                WHERE wt.to_status = "fertig"
                AND DATE(wt.transitioned_at) = ?
            ';
            $params = [$date];
            if ($tenantId) {
                $sql .= ' AND c.tenant_id = ?';
                $params[] = $tenantId;
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $completedToday = (int)$stmt->fetchColumn();
            
            // Store metrics
            $statusDistribution = json_encode([
                'offen' => $counts['open_count'],
                'inbearb' => $counts['inbearb_count'],
                'fertig' => $counts['fertig_count']
            ]);
            
            $stmt = $pdo->prepare('
                INSERT INTO contract_metrics 
                (tenant_id, date, total_contracts, status_distribution, completion_rate, new_contracts_today, completed_today)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    total_contracts = VALUES(total_contracts),
                    status_distribution = VALUES(status_distribution),
                    completion_rate = VALUES(completion_rate),
                    new_contracts_today = VALUES(new_contracts_today),
                    completed_today = VALUES(completed_today)
            ');
            
            $stmt->execute([
                $tenantId,
                $date,
                $counts['total'],
                $statusDistribution,
                $completionRate,
                $newToday,
                $completedToday
            ]);
            
            Logger::info('Metrics calculated', ['date' => $date, 'tenant_id' => $tenantId]);
            
            jsonResponse([
                'date' => $date,
                'total_contracts' => $counts['total'],
                'status_distribution' => json_decode($statusDistribution, true),
                'completion_rate' => $completionRate,
                'new_contracts_today' => $newToday,
                'completed_today' => $completedToday
            ]);
            
        } catch (Exception $e) {
            Logger::error('Metrics calculation failed', ['error' => $e->getMessage()]);
            errorResponse('Failed to calculate metrics', 500, 'metrics_error');
        }
    }
    
    /**
     * GET /api/analytics/export
     * Export analytics data
     */
    public function export() {
        $format = sanitize($_GET['format'] ?? 'json');
        $type = sanitize($_GET['type'] ?? 'dashboard');
        $days = min(365, max(7, (int)($_GET['days'] ?? 30)));
        
        try {
            $data = [];
            
            switch ($type) {
                case 'trends':
                    $data = $this->getTrendsData($days);
                    break;
                case 'bottlenecks':
                    $data = $this->getBottlenecksData();
                    break;
                default:
                    $data = $this->getDashboardData();
            }
            
            if ($format === 'csv') {
                $this->exportCsv($data, $type);
            } else {
                jsonResponse($data);
            }
            
        } catch (Exception $e) {
            Logger::error('Analytics export failed', ['error' => $e->getMessage()]);
            errorResponse('Failed to export analytics', 500, 'export_error');
        }
    }
    
    // =====================================================
    // Helper Methods
    // =====================================================
    
    private function getTenantId() {
        // Get tenant from session or request
        return $_SESSION['tenant_id'] ?? null;
    }
    
    private function getContractSummary($tenantId = null) {
        $pdo = db();
        
        $sql = '
            SELECT 
                COUNT(*) as total_contracts,
                SUM(CASE WHEN status = "offen" THEN 1 ELSE 0 END) as open_contracts,
                SUM(CASE WHEN status = "inbearb" THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = "fertig" THEN 1 ELSE 0 END) as completed
            FROM contracts
        ';
        
        $params = [];
        if ($tenantId) {
            $sql .= ' WHERE tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }
    
    private function getRecentMetrics($tenantId = null, $days = 30) {
        $pdo = db();
        $startDate = date('Y-m-d', strtotime("-{$days} days"));
        
        $sql = 'SELECT * FROM contract_metrics WHERE date >= ?';
        $params = [$startDate];
        
        if ($tenantId) {
            $sql .= ' AND tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $sql .= ' ORDER BY date ASC';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
    
    private function getSlaStatusSummary($tenantId = null) {
        $pdo = db();
        
        $sql = '
            SELECT status, COUNT(*) as count
            FROM contract_slas cs
            JOIN contracts c ON cs.contract_id = c.id
        ';
        $params = [];
        
        if ($tenantId) {
            $sql .= ' WHERE c.tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $sql .= ' GROUP BY status';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
    
    private function getRecentActivity($tenantId = null, $limit = 20) {
        $pdo = db();
        
        $sql = '
            SELECT 
                ua.*,
                u.username
            FROM user_activities ua
            JOIN users u ON ua.user_id = u.id
        ';
        $params = [];
        
        if ($tenantId) {
            $sql .= ' WHERE ua.tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $sql .= ' ORDER BY ua.timestamp DESC LIMIT ?';
        $params[] = $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
    
    private function getPendingApprovalsCount($tenantId = null) {
        $pdo = db();
        
        $sql = '
            SELECT COUNT(*) FROM contract_approvals ca
            JOIN contracts c ON ca.contract_id = c.id
            WHERE ca.status = "pending"
        ';
        $params = [];
        
        if ($tenantId) {
            $sql .= ' AND c.tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }
    
    private function calculateMovingAverage($data, $field, $window) {
        $result = [];
        $count = count($data);
        
        for ($i = 0; $i < $count; $i++) {
            $start = max(0, $i - $window + 1);
            $subset = array_slice($data, $start, $i - $start + 1);
            $sum = array_sum(array_column($subset, $field));
            $avg = count($subset) > 0 ? $sum / count($subset) : 0;
            
            $result[] = [
                'date' => $data[$i]['date'],
                'value' => round($avg, 2)
            ];
        }
        
        return $result;
    }
    
    private function exportCsv($data, $type) {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=analytics_' . $type . '_' . date('Y-m-d') . '.csv');
        
        $output = fopen('php://output', 'w');
        fwrite($output, "\xEF\xBB\xBF"); // BOM for Excel
        
        // Write headers and data based on type
        if (is_array($data) && !empty($data)) {
            fputcsv($output, array_keys($data[0] ?? $data));
            
            if (isset($data[0])) {
                foreach ($data as $row) {
                    fputcsv($output, array_values($row));
                }
            } else {
                fputcsv($output, array_values($data));
            }
        }
        
        fclose($output);
        exit;
    }
}

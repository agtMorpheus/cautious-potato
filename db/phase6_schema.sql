-- ============================================================
-- Contract Manager Phase 6 Database Schema Extensions
-- ============================================================
-- This script adds Phase 6 tables for:
-- - Analytics & Metrics
-- - Workflow & Approvals
-- - Multi-Tenancy
-- - Data Retention
--
-- Run after init_contract_manager.sql:
--   mysql -u root -p contract_manager < phase6_schema.sql
-- ============================================================

USE contract_manager;

-- ============================================================
-- Multi-Tenancy Support
-- ============================================================

-- Tenant Organizations Table
CREATE TABLE IF NOT EXISTS tenants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSON,  -- Tenant-specific configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_slug (slug),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add tenant_id to existing tables (if not exists)
-- Note: Run ALTER statements separately if columns already exist

-- Check and add tenant_id to contracts
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'contract_manager' AND TABLE_NAME = 'contracts' AND COLUMN_NAME = 'tenant_id');
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE contracts ADD COLUMN tenant_id INT UNSIGNED AFTER id', 
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add tenant_id to users
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'contract_manager' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'tenant_id');
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE users ADD COLUMN tenant_id INT UNSIGNED AFTER id', 
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add tenant_id to imports
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'contract_manager' AND TABLE_NAME = 'imports' AND COLUMN_NAME = 'tenant_id');
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE imports ADD COLUMN tenant_id INT UNSIGNED AFTER id', 
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Analytics & Metrics Tables
-- ============================================================

-- Contract Metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS contract_metrics (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED,
    date DATE NOT NULL,
    total_contracts INT UNSIGNED DEFAULT 0,
    status_distribution JSON,  -- { "offen": 10, "inbearb": 50, "fertig": 100 }
    avg_processing_time_days INT UNSIGNED DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    new_contracts_today INT UNSIGNED DEFAULT 0,
    completed_today INT UNSIGNED DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_tenant_date (tenant_id, date),
    INDEX idx_date (date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contract SLAs (Service Level Agreements)
CREATE TABLE IF NOT EXISTS contract_slas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id CHAR(36) NOT NULL,
    sla_type VARCHAR(50) NOT NULL,  -- 'response_time', 'completion_date', 'approval'
    target_value INT UNSIGNED,  -- Days or hours
    actual_value INT UNSIGNED,
    status ENUM('pending', 'met', 'at_risk', 'breached') DEFAULT 'pending',
    due_date DATETIME,
    resolved_at DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_contract_id (contract_id),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Activity Log (for analytics dashboard)
CREATE TABLE IF NOT EXISTS user_activities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED,
    user_id INT UNSIGNED NOT NULL,
    action VARCHAR(50) NOT NULL,  -- 'view_contract', 'edit_contract', 'import', 'export'
    resource_type VARCHAR(50),  -- 'contract', 'import', 'user'
    resource_id VARCHAR(36),
    metadata JSON,  -- Additional context
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_tenant_timestamp (tenant_id, timestamp),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Workflow & Approval System
-- ============================================================

-- Contract Approvals
CREATE TABLE IF NOT EXISTS contract_approvals (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id CHAR(36) NOT NULL,
    approver_id INT UNSIGNED NOT NULL,
    requested_by INT UNSIGNED,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    comments TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_date TIMESTAMP NULL,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_contract_id (contract_id),
    INDEX idx_approver_id (approver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workflow Transitions Log
CREATE TABLE IF NOT EXISTS workflow_transitions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id CHAR(36) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    transition_by INT UNSIGNED,
    reason TEXT,
    metadata JSON,
    transitioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (transition_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_contract_id (contract_id),
    INDEX idx_transitioned_at (transitioned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add approval_status and workflow fields to contracts
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'contract_manager' AND TABLE_NAME = 'contracts' AND COLUMN_NAME = 'approval_status');
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE contracts ADD COLUMN approval_status ENUM(''pending'', ''approved'', ''rejected'') DEFAULT ''pending'' AFTER status', 
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'contract_manager' AND TABLE_NAME = 'contracts' AND COLUMN_NAME = 'assigned_to');
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE contracts ADD COLUMN assigned_to INT UNSIGNED AFTER approval_status', 
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'contract_manager' AND TABLE_NAME = 'contracts' AND COLUMN_NAME = 'approver_id');
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE contracts ADD COLUMN approver_id INT UNSIGNED AFTER assigned_to', 
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'contract_manager' AND TABLE_NAME = 'contracts' AND COLUMN_NAME = 'approval_date');
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE contracts ADD COLUMN approval_date DATETIME AFTER approver_id', 
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Data Quality & Duplicate Management
-- ============================================================

-- Duplicate Contract Records
CREATE TABLE IF NOT EXISTS contract_duplicates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract1_id CHAR(36) NOT NULL,
    contract2_id CHAR(36) NOT NULL,
    similarity_score DECIMAL(5,4) NOT NULL,  -- 0.0000 to 1.0000
    reasons JSON,  -- ["Similar titles", "Same equipment ID"]
    status ENUM('pending', 'merged', 'dismissed') DEFAULT 'pending',
    resolved_by INT UNSIGNED,
    resolved_at TIMESTAMP NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract1_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (contract2_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    UNIQUE KEY uk_pair (contract1_id, contract2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Validation Rules
CREATE TABLE IF NOT EXISTS validation_rules (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED,
    field_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,  -- 'required', 'pattern', 'enum', 'range', 'unique'
    rule_config JSON NOT NULL,  -- Rule-specific configuration
    error_message VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_field (tenant_id, field_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Data Retention & Compliance
-- ============================================================

-- Archived Contracts
CREATE TABLE IF NOT EXISTS contract_archives (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    original_id CHAR(36) NOT NULL,
    tenant_id INT UNSIGNED,
    contract_data JSON NOT NULL,  -- Full contract snapshot
    history_data JSON,  -- Associated history
    archived_by INT UNSIGNED,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retention_until DATE,  -- When this can be permanently deleted
    reason VARCHAR(255),  -- 'retention_policy', 'manual', 'data_request'
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_archived_at (archived_at),
    INDEX idx_retention_until (retention_until),
    INDEX idx_original_id (original_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deletion Requests (GDPR compliance)
CREATE TABLE IF NOT EXISTS deletion_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED,
    requested_by INT UNSIGNED,
    request_type ENUM('user_data', 'contract', 'all_data') NOT NULL,
    target_id VARCHAR(36),  -- User ID or Contract ID
    status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
    reason TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processed_by INT UNSIGNED,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security Incidents Log
CREATE TABLE IF NOT EXISTS security_incidents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED,
    incident_type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    description TEXT NOT NULL,
    affected_users JSON,
    affected_data JSON,
    reported_by INT UNSIGNED,
    status ENUM('open', 'investigating', 'resolved', 'closed') DEFAULT 'open',
    resolution TEXT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_severity (severity),
    INDEX idx_status (status),
    INDEX idx_occurred_at (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED,
    user_id INT UNSIGNED NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'approval_request', 'contract_update', 'sla_warning'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    resource_type VARCHAR(50),
    resource_id VARCHAR(36),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Integration Configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS integrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'slack', 'email', 'webhook', 'erp'
    config JSON NOT NULL,  -- Encrypted configuration
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_type (tenant_id, type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Insert Default Tenant
-- ============================================================

INSERT INTO tenants (name, slug, is_active) VALUES 
    ('Default Organization', 'default', TRUE)
ON DUPLICATE KEY UPDATE name = name;

-- ============================================================
-- Insert Default Validation Rules
-- ============================================================

INSERT INTO validation_rules (tenant_id, field_name, rule_type, rule_config, error_message, is_active) VALUES
    (1, 'status', 'enum', '{"values": ["offen", "inbearb", "fertig"]}', 'Status must be one of: offen, inbearb, fertig', TRUE),
    (1, 'auftrag', 'required', '{}', 'Auftrag (contract ID) is required', TRUE),
    (1, 'auftrag', 'pattern', '{"regex": "^[A-Z0-9]+$"}', 'Auftrag must contain only uppercase letters and numbers', TRUE),
    (1, 'titel', 'required', '{}', 'Titel (title) is required', TRUE),
    (1, 'titel', 'range', '{"min_length": 5, "max_length": 500}', 'Titel must be between 5 and 500 characters', TRUE),
    (1, 'sollstart', 'date_range', '{"min": "-30 days", "max": "+2 years"}', 'Sollstart must be within valid date range', TRUE)
ON DUPLICATE KEY UPDATE field_name = field_name;

-- ============================================================
-- Views for Analytics
-- ============================================================

-- Daily metrics view
CREATE OR REPLACE VIEW v_daily_metrics AS
SELECT 
    DATE(created_at) as date,
    tenant_id,
    COUNT(*) as total_contracts,
    SUM(CASE WHEN status = 'offen' THEN 1 ELSE 0 END) as open_count,
    SUM(CASE WHEN status = 'inbearb' THEN 1 ELSE 0 END) as in_progress_count,
    SUM(CASE WHEN status = 'fertig' THEN 1 ELSE 0 END) as completed_count
FROM contracts
GROUP BY DATE(created_at), tenant_id;

-- SLA status summary view
CREATE OR REPLACE VIEW v_sla_summary AS
SELECT 
    status,
    sla_type,
    COUNT(*) as count,
    AVG(CASE WHEN actual_value IS NOT NULL THEN actual_value ELSE target_value END) as avg_value
FROM contract_slas
GROUP BY status, sla_type;

-- Bottleneck contracts view (stuck in inbearb > 30 days)
CREATE OR REPLACE VIEW v_bottleneck_contracts AS
SELECT 
    c.*,
    DATEDIFF(NOW(), c.created_at) as days_stuck
FROM contracts c
WHERE c.status = 'inbearb'
AND c.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- ============================================================
-- Stored Procedures for Phase 6
-- ============================================================

-- Procedure to calculate daily metrics
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS calculate_daily_metrics(IN p_date DATE, IN p_tenant_id INT)
BEGIN
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_open INT DEFAULT 0;
    DECLARE v_inbearb INT DEFAULT 0;
    DECLARE v_fertig INT DEFAULT 0;
    DECLARE v_completion_rate DECIMAL(5,2) DEFAULT 0;
    DECLARE v_new_today INT DEFAULT 0;
    DECLARE v_completed_today INT DEFAULT 0;
    
    -- Get counts
    SELECT 
        COUNT(*),
        SUM(CASE WHEN status = 'offen' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'inbearb' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'fertig' THEN 1 ELSE 0 END)
    INTO v_total, v_open, v_inbearb, v_fertig
    FROM contracts
    WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Calculate completion rate
    IF v_total > 0 THEN
        SET v_completion_rate = (v_fertig / v_total) * 100;
    END IF;
    
    -- Get new contracts today
    SELECT COUNT(*) INTO v_new_today
    FROM contracts
    WHERE DATE(created_at) = p_date
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Get completed today
    SELECT COUNT(*) INTO v_completed_today
    FROM workflow_transitions
    WHERE to_status = 'fertig'
    AND DATE(transitioned_at) = p_date
    AND contract_id IN (
        SELECT id FROM contracts WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    );
    
    -- Insert or update metrics
    INSERT INTO contract_metrics (tenant_id, date, total_contracts, status_distribution, completion_rate, new_contracts_today, completed_today)
    VALUES (
        p_tenant_id,
        p_date,
        v_total,
        JSON_OBJECT('offen', v_open, 'inbearb', v_inbearb, 'fertig', v_fertig),
        v_completion_rate,
        v_new_today,
        v_completed_today
    )
    ON DUPLICATE KEY UPDATE
        total_contracts = v_total,
        status_distribution = JSON_OBJECT('offen', v_open, 'inbearb', v_inbearb, 'fertig', v_fertig),
        completion_rate = v_completion_rate,
        new_contracts_today = v_new_today,
        completed_today = v_completed_today;
END //
DELIMITER ;

-- Procedure to archive old contracts
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS archive_old_contracts(IN p_retention_days INT, IN p_tenant_id INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_contract_id CHAR(36);
    DECLARE v_contract_data JSON;
    DECLARE v_history_data JSON;
    
    DECLARE contract_cursor CURSOR FOR
        SELECT id FROM contracts
        WHERE status = 'fertig'
        AND updated_at < DATE_SUB(NOW(), INTERVAL p_retention_days DAY)
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN contract_cursor;
    
    archive_loop: LOOP
        FETCH contract_cursor INTO v_contract_id;
        IF done THEN
            LEAVE archive_loop;
        END IF;
        
        -- Get contract data as JSON
        SELECT JSON_OBJECT(
            'id', id,
            'auftrag', auftrag,
            'titel', titel,
            'standort', standort,
            'status', status,
            'created_at', created_at,
            'updated_at', updated_at
        ) INTO v_contract_data
        FROM contracts WHERE id = v_contract_id;
        
        -- Get history data
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'field_name', field_name,
                'old_value', old_value,
                'new_value', new_value,
                'changed_at', changed_at
            )
        ) INTO v_history_data
        FROM contract_history WHERE contract_id = v_contract_id;
        
        -- Insert into archive
        INSERT INTO contract_archives (original_id, tenant_id, contract_data, history_data, reason, retention_until)
        SELECT id, tenant_id, v_contract_data, v_history_data, 'retention_policy', DATE_ADD(NOW(), INTERVAL 7 YEAR)
        FROM contracts WHERE id = v_contract_id;
        
        -- Delete original
        DELETE FROM contracts WHERE id = v_contract_id;
    END LOOP;
    
    CLOSE contract_cursor;
END //
DELIMITER ;

-- ============================================================
-- End of Phase 6 Schema
-- ============================================================

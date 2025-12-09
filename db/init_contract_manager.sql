-- ============================================================
-- Contract Manager Database Initialization Script (Phase 5)
-- ============================================================
-- This script creates all required tables for the Contract Manager
-- backend. Run this script on your MySQL server after setting up XAMPP.
--
-- Usage:
--   mysql -u root -p < init_contract_manager.sql
--
-- Or via phpMyAdmin: Import this file through the web interface.
-- ============================================================

-- Create database
CREATE DATABASE IF NOT EXISTS contract_manager 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE contract_manager;

-- ============================================================
-- Users Table
-- ============================================================
-- Stores user accounts for authentication and authorization

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'viewer') DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Contracts Table
-- ============================================================
-- Core contract data storage

CREATE TABLE IF NOT EXISTS contracts (
    id CHAR(36) PRIMARY KEY,  -- UUID format
    auftrag VARCHAR(50) NOT NULL,
    titel TEXT NOT NULL,
    standort VARCHAR(255),
    saeule_raum VARCHAR(100),
    anlage_nr VARCHAR(100),
    beschreibung TEXT,
    status ENUM('offen', 'inbearb', 'fertig') DEFAULT 'offen',
    sollstart DATE,
    workorder_code VARCHAR(100),
    melder VARCHAR(255),
    seriennummer VARCHAR(100),
    is_complete BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT UNSIGNED,
    updated_by INT UNSIGNED,
    
    UNIQUE KEY uk_auftrag (auftrag),
    INDEX idx_status (status),
    INDEX idx_standort (standort(50)),
    INDEX idx_sollstart (sollstart),
    INDEX idx_created_at (created_at),
    INDEX idx_anlage_nr (anlage_nr),
    INDEX idx_status_created (status, created_at DESC),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Imports Table
-- ============================================================
-- Tracks file import history

CREATE TABLE IF NOT EXISTS imports (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_size INT UNSIGNED,
    sheet_name VARCHAR(255),
    records_imported INT UNSIGNED DEFAULT 0,
    records_with_errors INT UNSIGNED DEFAULT 0,
    import_mapping JSON,  -- Store mapping configuration used
    
    imported_by INT UNSIGNED NOT NULL,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_imported_at (imported_at),
    INDEX idx_imported_by (imported_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Import Errors Table
-- ============================================================
-- Stores errors/warnings from import operations

CREATE TABLE IF NOT EXISTS import_errors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    import_id INT UNSIGNED NOT NULL,
    row_number INT UNSIGNED,
    error_type VARCHAR(50),  -- 'missing_field', 'invalid_type', 'duplicate', etc.
    error_message TEXT,
    affected_fields JSON,
    
    INDEX idx_import_id (import_id),
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Contract History Table
-- ============================================================
-- Audit trail for contract changes

CREATE TABLE IF NOT EXISTS contract_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id CHAR(36) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by INT UNSIGNED NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_contract_id (contract_id),
    INDEX idx_changed_at (changed_at),
    INDEX idx_contract_changed (contract_id, changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Sessions Table
-- ============================================================
-- User session tracking

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    logged_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Application Logs Table
-- ============================================================
-- Server-side logging for monitoring

CREATE TABLE IF NOT EXISTS logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    log_level ENUM('debug', 'info', 'warning', 'error') DEFAULT 'info',
    message TEXT,
    context JSON,  -- { user_id, action, resource_id, etc. }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_log_level (log_level),
    INDEX idx_created_at (created_at),
    INDEX idx_level_created (log_level, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Initial Data
-- ============================================================

-- Insert default admin user
-- Password: admin123 (MUST BE CHANGED IN PRODUCTION!)
-- Password hash generated with PHP password_hash('admin123', PASSWORD_BCRYPT)
INSERT INTO users (username, email, password_hash, role, is_active) VALUES 
    ('admin', 'admin@localhost', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE)
ON DUPLICATE KEY UPDATE username = username;

-- ============================================================
-- Stored Procedures
-- ============================================================

-- Procedure to clean up old sessions (run via cron)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS cleanup_old_sessions()
BEGIN
    DELETE FROM sessions 
    WHERE last_activity < DATE_SUB(NOW(), INTERVAL 24 HOUR);
END //
DELIMITER ;

-- Procedure to clean up old debug logs (run via cron)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS cleanup_old_logs()
BEGIN
    DELETE FROM logs 
    WHERE log_level = 'debug' 
    AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    DELETE FROM logs 
    WHERE log_level = 'info' 
    AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
END //
DELIMITER ;

-- ============================================================
-- Views
-- ============================================================

-- View for contract summary statistics
CREATE OR REPLACE VIEW contract_stats AS
SELECT 
    COUNT(*) as total_contracts,
    SUM(CASE WHEN status = 'offen' THEN 1 ELSE 0 END) as open_count,
    SUM(CASE WHEN status = 'inbearb' THEN 1 ELSE 0 END) as in_progress_count,
    SUM(CASE WHEN status = 'fertig' THEN 1 ELSE 0 END) as completed_count,
    SUM(CASE WHEN is_complete = TRUE THEN 1 ELSE 0 END) as complete_data_count,
    MIN(created_at) as first_contract_date,
    MAX(created_at) as last_contract_date
FROM contracts;

-- View for recent activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    ch.id,
    ch.contract_id,
    c.auftrag,
    c.titel,
    ch.field_name,
    ch.old_value,
    ch.new_value,
    ch.changed_at,
    u.username as changed_by_username
FROM contract_history ch
JOIN contracts c ON ch.contract_id = c.id
JOIN users u ON ch.changed_by = u.id
ORDER BY ch.changed_at DESC
LIMIT 100;

-- ============================================================
-- Triggers
-- ============================================================

-- Trigger to update contract updated_at timestamp
DELIMITER //
CREATE TRIGGER IF NOT EXISTS contracts_before_update
BEFORE UPDATE ON contracts
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- ============================================================
-- Grants (adjust as needed for your setup)
-- ============================================================

-- Create application user (optional, adjust credentials)
-- CREATE USER IF NOT EXISTS 'cm_user'@'localhost' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON contract_manager.* TO 'cm_user'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================================================
-- Verification Queries
-- ============================================================

-- Run these queries to verify the setup:
-- SHOW TABLES;
-- DESCRIBE contracts;
-- DESCRIBE users;
-- SELECT * FROM users;
-- SELECT * FROM contract_stats;

-- ============================================================
-- End of initialization script
-- ============================================================

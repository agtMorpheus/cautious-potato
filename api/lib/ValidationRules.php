<?php
/**
 * Validation Rules Engine (Phase 6)
 * 
 * Provides flexible, configurable validation for contract data.
 * Supports rule definitions stored in database for tenant customization.
 */

class ValidationRules {
    
    /**
     * Default validation rules (used when no database rules exist)
     */
    private static $defaultRules = [
        'status' => [
            'type' => 'enum',
            'values' => ['offen', 'inbearb', 'fertig', 'review', 'approved', 'rejected'],
            'required' => true,
            'message' => 'Status must be a valid status value'
        ],
        'auftrag' => [
            'type' => 'string',
            'required' => true,
            'pattern' => '^[A-Za-z0-9\-_]+$',
            'min_length' => 1,
            'max_length' => 50,
            'unique' => true,
            'message' => 'Auftrag is required and must be alphanumeric'
        ],
        'titel' => [
            'type' => 'string',
            'required' => true,
            'min_length' => 3,
            'max_length' => 500,
            'message' => 'Titel is required and must be between 3 and 500 characters'
        ],
        'sollstart' => [
            'type' => 'date',
            'required' => false,
            'min_date' => '-365 days',
            'max_date' => '+5 years',
            'message' => 'Sollstart must be a valid date within allowed range'
        ],
        'standort' => [
            'type' => 'string',
            'required' => false,
            'max_length' => 255,
            'message' => 'Standort must not exceed 255 characters'
        ],
        'saeule_raum' => [
            'type' => 'string',
            'required' => false,
            'max_length' => 100,
            'message' => 'Saeule/Raum must not exceed 100 characters'
        ],
        'anlage_nr' => [
            'type' => 'string',
            'required' => false,
            'max_length' => 100,
            'message' => 'Anlage-Nr must not exceed 100 characters'
        ],
        'seriennummer' => [
            'type' => 'string',
            'required' => false,
            'max_length' => 100,
            'message' => 'Seriennummer must not exceed 100 characters'
        ]
    ];
    
    /**
     * Validate contract data against rules
     * 
     * @param array|object $data Contract data to validate
     * @param string|null $contractId Contract ID (for uniqueness checks)
     * @param int|null $tenantId Tenant ID for custom rules
     * @return array Validation result with 'valid' boolean and 'errors' array
     */
    public static function validate($data, $contractId = null, $tenantId = null) {
        // Convert object to array if needed
        if (is_object($data)) {
            $data = (array)$data;
        }
        
        $errors = [];
        $rules = self::getRules($tenantId);
        
        foreach ($rules as $field => $rule) {
            $value = $data[$field] ?? null;
            $fieldErrors = self::validateField($field, $value, $rule, $data, $contractId);
            
            if (!empty($fieldErrors)) {
                $errors[$field] = $fieldErrors;
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * Validate a single field
     * 
     * @param string $field Field name
     * @param mixed $value Field value
     * @param array $rule Validation rule
     * @param array $allData All contract data (for cross-field validation)
     * @param string|null $contractId Contract ID for uniqueness check
     * @return array Array of error messages for this field
     */
    private static function validateField($field, $value, $rule, $allData, $contractId = null) {
        $errors = [];
        
        // Required check
        if (!empty($rule['required']) && self::isEmpty($value)) {
            $errors[] = $rule['message'] ?? "Field '$field' is required";
            return $errors; // No point continuing if required field is empty
        }
        
        // Skip other validations if value is empty and not required
        if (self::isEmpty($value)) {
            return $errors;
        }
        
        // Type-specific validation
        $type = $rule['type'] ?? 'string';
        
        switch ($type) {
            case 'enum':
                if (!self::validateEnum($value, $rule)) {
                    $allowedValues = implode(', ', $rule['values'] ?? []);
                    $errors[] = $rule['message'] ?? "Field '$field' must be one of: $allowedValues";
                }
                break;
                
            case 'date':
                $dateResult = self::validateDate($value, $rule);
                if ($dateResult !== true) {
                    $errors[] = $rule['message'] ?? $dateResult;
                }
                break;
                
            case 'number':
            case 'integer':
                $numResult = self::validateNumber($value, $rule);
                if ($numResult !== true) {
                    $errors[] = $rule['message'] ?? $numResult;
                }
                break;
                
            case 'string':
            default:
                $strResult = self::validateString($value, $rule);
                if ($strResult !== true) {
                    $errors[] = $rule['message'] ?? $strResult;
                }
                break;
        }
        
        // Pattern validation (regex)
        if (!empty($rule['pattern']) && !self::isEmpty($value)) {
            if (!preg_match('/' . $rule['pattern'] . '/', $value)) {
                $errors[] = $rule['pattern_message'] ?? "Field '$field' has invalid format";
            }
        }
        
        // Uniqueness check
        if (!empty($rule['unique']) && !self::isEmpty($value)) {
            if (!self::checkUnique($field, $value, $contractId, $allData['tenant_id'] ?? null)) {
                $errors[] = "Field '$field' must be unique. Value '$value' already exists.";
            }
        }
        
        return $errors;
    }
    
    /**
     * Check if value is empty
     */
    private static function isEmpty($value) {
        return $value === null || $value === '' || (is_array($value) && empty($value));
    }
    
    /**
     * Validate enum value
     */
    private static function validateEnum($value, $rule) {
        $allowedValues = $rule['values'] ?? [];
        return in_array($value, $allowedValues, true);
    }
    
    /**
     * Validate date value
     * 
     * @return true|string True if valid, error message if invalid
     */
    private static function validateDate($value, $rule) {
        // Try to parse the date
        $timestamp = strtotime($value);
        
        if ($timestamp === false) {
            return "Invalid date format";
        }
        
        // Check min date
        if (!empty($rule['min_date'])) {
            $minTimestamp = strtotime($rule['min_date']);
            if ($timestamp < $minTimestamp) {
                return "Date must be after " . date('Y-m-d', $minTimestamp);
            }
        }
        
        // Check max date
        if (!empty($rule['max_date'])) {
            $maxTimestamp = strtotime($rule['max_date']);
            if ($timestamp > $maxTimestamp) {
                return "Date must be before " . date('Y-m-d', $maxTimestamp);
            }
        }
        
        return true;
    }
    
    /**
     * Validate number value
     * 
     * @return true|string True if valid, error message if invalid
     */
    private static function validateNumber($value, $rule) {
        if (!is_numeric($value)) {
            return "Value must be a number";
        }
        
        $numValue = floatval($value);
        
        // Check integer constraint
        if (($rule['type'] ?? '') === 'integer' && floor($numValue) != $numValue) {
            return "Value must be an integer";
        }
        
        // Check min value
        if (isset($rule['min']) && $numValue < $rule['min']) {
            return "Value must be at least " . $rule['min'];
        }
        
        // Check max value
        if (isset($rule['max']) && $numValue > $rule['max']) {
            return "Value must not exceed " . $rule['max'];
        }
        
        return true;
    }
    
    /**
     * Validate string value
     * 
     * @return true|string True if valid, error message if invalid
     */
    private static function validateString($value, $rule) {
        if (!is_string($value)) {
            $value = (string)$value;
        }
        
        $length = mb_strlen($value);
        
        // Check min length
        if (isset($rule['min_length']) && $length < $rule['min_length']) {
            return "Value must be at least " . $rule['min_length'] . " characters";
        }
        
        // Check max length
        if (isset($rule['max_length']) && $length > $rule['max_length']) {
            return "Value must not exceed " . $rule['max_length'] . " characters";
        }
        
        return true;
    }
    
    /**
     * Check if value is unique in database
     */
    private static function checkUnique($field, $value, $contractId = null, $tenantId = null) {
        $pdo = db();
        
        $sql = "SELECT id FROM contracts WHERE $field = ?";
        $params = [$value];
        
        if ($contractId) {
            $sql .= ' AND id != ?';
            $params[] = $contractId;
        }
        
        if ($tenantId) {
            $sql .= ' AND tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch() === false;
    }
    
    /**
     * Get validation rules (from database or defaults)
     * 
     * @param int|null $tenantId Tenant ID for custom rules
     * @return array Validation rules indexed by field name
     */
    public static function getRules($tenantId = null) {
        $rules = self::$defaultRules;
        
        // Try to load custom rules from database
        try {
            $pdo = db();
            
            $sql = 'SELECT field_name, rule_type, rule_config, error_message 
                    FROM validation_rules WHERE is_active = TRUE';
            $params = [];
            
            if ($tenantId) {
                $sql .= ' AND (tenant_id = ? OR tenant_id IS NULL)';
                $params[] = $tenantId;
            } else {
                $sql .= ' AND tenant_id IS NULL';
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $dbRules = $stmt->fetchAll();
            
            // Merge database rules into defaults
            foreach ($dbRules as $dbRule) {
                $field = $dbRule['field_name'];
                $config = json_decode($dbRule['rule_config'], true) ?? [];
                
                if (!isset($rules[$field])) {
                    $rules[$field] = [];
                }
                
                // Merge rule config
                $rules[$field] = array_merge($rules[$field], $config);
                
                if (!empty($dbRule['error_message'])) {
                    $rules[$field]['message'] = $dbRule['error_message'];
                }
            }
            
        } catch (Exception $e) {
            Logger::warning('Failed to load custom validation rules', ['error' => $e->getMessage()]);
        }
        
        return $rules;
    }
    
    /**
     * Add or update a validation rule in database
     * 
     * @param string $field Field name
     * @param string $ruleType Rule type
     * @param array $config Rule configuration
     * @param string|null $errorMessage Custom error message
     * @param int|null $tenantId Tenant ID
     * @return int Rule ID
     */
    public static function addRule($field, $ruleType, $config, $errorMessage = null, $tenantId = null) {
        $pdo = db();
        
        $stmt = $pdo->prepare('
            INSERT INTO validation_rules (tenant_id, field_name, rule_type, rule_config, error_message)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                rule_config = VALUES(rule_config),
                error_message = VALUES(error_message),
                updated_at = NOW()
        ');
        
        $stmt->execute([
            $tenantId,
            $field,
            $ruleType,
            json_encode($config),
            $errorMessage
        ]);
        
        return $pdo->lastInsertId();
    }
    
    /**
     * Validate multiple contracts and return summary
     * 
     * @param array $contracts Array of contract data
     * @param int|null $tenantId Tenant ID
     * @return array Validation summary
     */
    public static function validateBatch($contracts, $tenantId = null) {
        $results = [
            'total' => count($contracts),
            'valid' => 0,
            'invalid' => 0,
            'errors' => []
        ];
        
        foreach ($contracts as $index => $contract) {
            $result = self::validate($contract, $contract['id'] ?? null, $tenantId);
            
            if ($result['valid']) {
                $results['valid']++;
            } else {
                $results['invalid']++;
                $results['errors'][$index] = $result['errors'];
            }
        }
        
        return $results;
    }
    
    /**
     * Get validation errors as flat array of messages
     * 
     * @param array $validationResult Result from validate()
     * @return array Flat array of error messages
     */
    public static function flattenErrors($validationResult) {
        $messages = [];
        
        if (empty($validationResult['errors'])) {
            return $messages;
        }
        
        foreach ($validationResult['errors'] as $field => $fieldErrors) {
            foreach ((array)$fieldErrors as $error) {
                $messages[] = $error;
            }
        }
        
        return $messages;
    }
}

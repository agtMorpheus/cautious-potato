<?php
/**
 * Duplicate Detector (Phase 6)
 * 
 * Detects potential duplicate contracts based on similarity scoring
 * across multiple fields. Supports merging duplicates.
 */

class DuplicateDetector {
    
    /**
     * Similarity threshold for flagging duplicates (0.0 - 1.0)
     */
    const SIMILARITY_THRESHOLD = 0.8;
    
    /**
     * Field weights for similarity calculation
     */
    private static $fieldWeights = [
        'titel' => 0.30,
        'anlage_nr' => 0.25,
        'standort' => 0.20,
        'saeule_raum' => 0.10,
        'auftrag' => 0.10,
        'date_proximity' => 0.05
    ];
    
    /**
     * Find potential duplicates across all contracts
     * 
     * @param int|null $tenantId Optional tenant filter
     * @param float|null $threshold Custom similarity threshold
     * @return array List of duplicate pairs with similarity scores
     */
    public static function findDuplicates($tenantId = null, $threshold = null) {
        $threshold = $threshold ?? self::SIMILARITY_THRESHOLD;
        $pdo = db();
        
        // Build query
        $sql = 'SELECT id, auftrag, titel, standort, saeule_raum, anlage_nr, created_at FROM contracts';
        $params = [];
        
        if ($tenantId) {
            $sql .= ' WHERE tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $contracts = $stmt->fetchAll();
        
        $duplicates = [];
        $processedPairs = [];
        
        // Compare each pair (O(n²) - optimize with indexing for large datasets)
        for ($i = 0; $i < count($contracts); $i++) {
            for ($j = $i + 1; $j < count($contracts); $j++) {
                $contract1 = $contracts[$i];
                $contract2 = $contracts[$j];
                
                // Skip if already processed
                $pairKey = min($contract1['id'], $contract2['id']) . ':' . max($contract1['id'], $contract2['id']);
                if (isset($processedPairs[$pairKey])) {
                    continue;
                }
                $processedPairs[$pairKey] = true;
                
                // Calculate similarity
                $result = self::calculateSimilarity($contract1, $contract2);
                
                if ($result['score'] >= $threshold) {
                    $duplicates[] = [
                        'contract1' => $contract1,
                        'contract2' => $contract2,
                        'similarity' => round($result['score'], 4),
                        'reasons' => $result['reasons'],
                        'field_scores' => $result['field_scores']
                    ];
                }
            }
        }
        
        // Sort by similarity (highest first)
        usort($duplicates, function($a, $b) {
            return $b['similarity'] <=> $a['similarity'];
        });
        
        return $duplicates;
    }
    
    /**
     * Find duplicates for a specific contract
     * 
     * @param string $contractId Contract UUID
     * @param float|null $threshold Custom similarity threshold
     * @return array List of potential duplicates
     */
    public static function findDuplicatesFor($contractId, $threshold = null) {
        $threshold = $threshold ?? self::SIMILARITY_THRESHOLD;
        $pdo = db();
        
        // Get the contract
        $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
        $stmt->execute([$contractId]);
        $contract = $stmt->fetch();
        
        if (!$contract) {
            throw new Exception('Contract not found');
        }
        
        // Get other contracts (same tenant if applicable)
        $sql = 'SELECT id, auftrag, titel, standort, saeule_raum, anlage_nr, created_at 
                FROM contracts WHERE id != ?';
        $params = [$contractId];
        
        if (!empty($contract['tenant_id'])) {
            $sql .= ' AND tenant_id = ?';
            $params[] = $contract['tenant_id'];
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $otherContracts = $stmt->fetchAll();
        
        $duplicates = [];
        
        foreach ($otherContracts as $other) {
            $result = self::calculateSimilarity($contract, $other);
            
            if ($result['score'] >= $threshold) {
                $duplicates[] = [
                    'contract' => $other,
                    'similarity' => round($result['score'], 4),
                    'reasons' => $result['reasons'],
                    'field_scores' => $result['field_scores']
                ];
            }
        }
        
        // Sort by similarity
        usort($duplicates, function($a, $b) {
            return $b['similarity'] <=> $a['similarity'];
        });
        
        return $duplicates;
    }
    
    /**
     * Calculate similarity score between two contracts
     * 
     * @param array $c1 First contract
     * @param array $c2 Second contract
     * @return array Similarity score, reasons, and field scores
     */
    public static function calculateSimilarity($c1, $c2) {
        $scores = [];
        $reasons = [];
        
        // Title similarity (Levenshtein distance normalized)
        if (!empty($c1['titel']) && !empty($c2['titel'])) {
            $maxLen = max(strlen($c1['titel']), strlen($c2['titel']));
            if ($maxLen > 0) {
                $distance = levenshtein(
                    mb_strtolower(mb_substr($c1['titel'], 0, 255)),
                    mb_strtolower(mb_substr($c2['titel'], 0, 255))
                );
                $scores['titel'] = 1 - ($distance / $maxLen);
                
                if ($scores['titel'] > 0.8) {
                    $reasons[] = 'Similar titles';
                }
            }
        } else {
            $scores['titel'] = 0;
        }
        
        // Equipment ID exact match
        if (!empty($c1['anlage_nr']) && !empty($c2['anlage_nr'])) {
            $scores['anlage_nr'] = strtolower($c1['anlage_nr']) === strtolower($c2['anlage_nr']) ? 1.0 : 0.0;
            if ($scores['anlage_nr'] === 1.0) {
                $reasons[] = 'Same equipment ID';
            }
        } else {
            $scores['anlage_nr'] = 0;
        }
        
        // Location similarity
        if (!empty($c1['standort']) && !empty($c2['standort'])) {
            $scores['standort'] = strtolower($c1['standort']) === strtolower($c2['standort']) ? 1.0 : 0.0;
            if ($scores['standort'] === 1.0) {
                $reasons[] = 'Same location';
            }
        } else {
            $scores['standort'] = 0;
        }
        
        // Room/area match
        if (!empty($c1['saeule_raum']) && !empty($c2['saeule_raum'])) {
            $scores['saeule_raum'] = strtolower($c1['saeule_raum']) === strtolower($c2['saeule_raum']) ? 1.0 : 0.0;
            if ($scores['saeule_raum'] === 1.0 && $scores['standort'] === 1.0) {
                $reasons[] = 'Same location and room';
            }
        } else {
            $scores['saeule_raum'] = 0;
        }
        
        // Auftrag similarity (partial match)
        if (!empty($c1['auftrag']) && !empty($c2['auftrag'])) {
            $auftrag1 = strtolower($c1['auftrag']);
            $auftrag2 = strtolower($c2['auftrag']);
            
            // Check for common prefix (often indicates related contracts)
            $commonPrefix = self::commonPrefixLength($auftrag1, $auftrag2);
            $scores['auftrag'] = $commonPrefix / max(strlen($auftrag1), strlen($auftrag2));
            
            if ($scores['auftrag'] > 0.7) {
                $reasons[] = 'Similar contract IDs';
            }
        } else {
            $scores['auftrag'] = 0;
        }
        
        // Date proximity (within 7 days = high score)
        if (!empty($c1['created_at']) && !empty($c2['created_at'])) {
            $dateDiff = abs(strtotime($c1['created_at']) - strtotime($c2['created_at']));
            $daysDiff = $dateDiff / (24 * 60 * 60);
            
            if ($daysDiff <= 1) {
                $scores['date_proximity'] = 1.0;
            } elseif ($daysDiff <= 7) {
                $scores['date_proximity'] = 1 - ($daysDiff / 7);
            } else {
                $scores['date_proximity'] = 0;
            }
            
            if ($daysDiff <= 1) {
                $reasons[] = 'Created on same day';
            }
        } else {
            $scores['date_proximity'] = 0;
        }
        
        // Calculate weighted average
        $totalScore = 0;
        $totalWeight = 0;
        
        foreach (self::$fieldWeights as $field => $weight) {
            if (isset($scores[$field])) {
                $totalScore += $scores[$field] * $weight;
                $totalWeight += $weight;
            }
        }
        
        $finalScore = $totalWeight > 0 ? $totalScore / $totalWeight : 0;
        
        return [
            'score' => $finalScore,
            'reasons' => $reasons,
            'field_scores' => $scores
        ];
    }
    
    /**
     * Merge two contracts (keep one, delete the other)
     * 
     * @param string $keepId Contract ID to keep
     * @param string $deleteId Contract ID to delete
     * @param int|null $userId User performing the merge
     * @return array Merged contract data
     */
    public static function mergeContracts($keepId, $deleteId, $userId = null) {
        $pdo = db();
        
        // Get both contracts
        $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id IN (?, ?)');
        $stmt->execute([$keepId, $deleteId]);
        $contracts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($contracts) !== 2) {
            throw new Exception('One or both contracts not found');
        }
        
        $keep = null;
        $delete = null;
        
        foreach ($contracts as $c) {
            if ($c['id'] === $keepId) {
                $keep = $c;
            } else {
                $delete = $c;
            }
        }
        
        $pdo->beginTransaction();
        
        try {
            // Merge non-empty fields from delete into keep (if keep is empty)
            $fieldsToMerge = ['titel', 'standort', 'saeule_raum', 'anlage_nr', 'beschreibung', 
                             'workorder_code', 'melder', 'seriennummer'];
            
            $updates = [];
            $params = [];
            
            foreach ($fieldsToMerge as $field) {
                if (empty($keep[$field]) && !empty($delete[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $delete[$field];
                }
            }
            
            if (!empty($updates)) {
                $params[] = $keepId;
                $sql = 'UPDATE contracts SET ' . implode(', ', $updates) . ' WHERE id = ?';
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }
            
            // Move history from deleted contract to kept contract
            $stmt = $pdo->prepare('
                UPDATE contract_history SET contract_id = ? WHERE contract_id = ?
            ');
            $stmt->execute([$keepId, $deleteId]);
            
            // Move workflow transitions
            $stmt = $pdo->prepare('
                UPDATE workflow_transitions SET contract_id = ? WHERE contract_id = ?
            ');
            $stmt->execute([$keepId, $deleteId]);
            
            // Move approvals
            $stmt = $pdo->prepare('
                UPDATE contract_approvals SET contract_id = ? WHERE contract_id = ?
            ');
            $stmt->execute([$keepId, $deleteId]);
            
            // Move SLAs
            $stmt = $pdo->prepare('
                UPDATE contract_slas SET contract_id = ? WHERE contract_id = ?
            ');
            $stmt->execute([$keepId, $deleteId]);
            
            // Record the merge in history
            $stmt = $pdo->prepare('
                INSERT INTO contract_history 
                (contract_id, field_name, old_value, new_value, changed_by)
                VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $keepId,
                '_merged',
                $delete['auftrag'],
                'Contract merged from ' . $delete['auftrag'],
                $userId
            ]);
            
            // Delete the duplicate contract
            $stmt = $pdo->prepare('DELETE FROM contracts WHERE id = ?');
            $stmt->execute([$deleteId]);
            
            // Update duplicate record if exists
            $stmt = $pdo->prepare('
                UPDATE contract_duplicates 
                SET status = "merged", resolved_by = ?, resolved_at = NOW()
                WHERE (contract1_id = ? AND contract2_id = ?) OR (contract1_id = ? AND contract2_id = ?)
            ');
            $stmt->execute([$userId, $keepId, $deleteId, $deleteId, $keepId]);
            
            $pdo->commit();
            
            Logger::info('Contracts merged', [
                'kept' => $keepId,
                'deleted' => $deleteId,
                'user_id' => $userId
            ]);
            
            // Return updated contract
            $stmt = $pdo->prepare('SELECT * FROM contracts WHERE id = ?');
            $stmt->execute([$keepId]);
            return $stmt->fetch();
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * Dismiss a duplicate pair (mark as not duplicates)
     * 
     * @param string $contract1Id First contract ID
     * @param string $contract2Id Second contract ID
     * @param int|null $userId User dismissing the duplicate
     * @return bool Success
     */
    public static function dismissDuplicate($contract1Id, $contract2Id, $userId = null) {
        $pdo = db();
        
        $stmt = $pdo->prepare('
            UPDATE contract_duplicates 
            SET status = "dismissed", resolved_by = ?, resolved_at = NOW()
            WHERE (contract1_id = ? AND contract2_id = ?) OR (contract1_id = ? AND contract2_id = ?)
        ');
        $stmt->execute([$userId, $contract1Id, $contract2Id, $contract2Id, $contract1Id]);
        
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Store detected duplicates in database for review
     * 
     * @param array $duplicates Array of duplicate pairs from findDuplicates()
     * @return int Number of records stored
     */
    public static function storeDuplicates($duplicates) {
        $pdo = db();
        $count = 0;
        
        $stmt = $pdo->prepare('
            INSERT INTO contract_duplicates 
            (contract1_id, contract2_id, similarity_score, reasons, status)
            VALUES (?, ?, ?, ?, "pending")
            ON DUPLICATE KEY UPDATE 
                similarity_score = VALUES(similarity_score),
                reasons = VALUES(reasons)
        ');
        
        foreach ($duplicates as $dup) {
            // Always store in consistent order (smaller ID first)
            $id1 = min($dup['contract1']['id'], $dup['contract2']['id']);
            $id2 = max($dup['contract1']['id'], $dup['contract2']['id']);
            
            $stmt->execute([
                $id1,
                $id2,
                $dup['similarity'],
                json_encode($dup['reasons'])
            ]);
            
            if ($stmt->rowCount() > 0) {
                $count++;
            }
        }
        
        return $count;
    }
    
    /**
     * Get pending duplicates for review
     * 
     * @param int|null $tenantId Optional tenant filter
     * @return array List of pending duplicate pairs
     */
    public static function getPendingDuplicates($tenantId = null) {
        $pdo = db();
        
        $sql = '
            SELECT 
                cd.*,
                c1.auftrag as contract1_auftrag,
                c1.titel as contract1_titel,
                c2.auftrag as contract2_auftrag,
                c2.titel as contract2_titel
            FROM contract_duplicates cd
            JOIN contracts c1 ON cd.contract1_id = c1.id
            JOIN contracts c2 ON cd.contract2_id = c2.id
            WHERE cd.status = "pending"
        ';
        
        $params = [];
        if ($tenantId) {
            $sql .= ' AND c1.tenant_id = ?';
            $params[] = $tenantId;
        }
        
        $sql .= ' ORDER BY cd.similarity_score DESC';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }
    
    /**
     * Calculate common prefix length of two strings
     * 
     * @param string $str1 First string
     * @param string $str2 Second string
     * @return int Common prefix length
     */
    private static function commonPrefixLength($str1, $str2) {
        $len = min(strlen($str1), strlen($str2));
        $common = 0;
        
        for ($i = 0; $i < $len; $i++) {
            if ($str1[$i] === $str2[$i]) {
                $common++;
            } else {
                break;
            }
        }
        
        return $common;
    }
}

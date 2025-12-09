<?php
/**
 * Cache Library (Phase 6)
 * 
 * Redis-based caching layer for API responses and data.
 * Falls back to file-based caching if Redis is not available.
 */

class Cache {
    private static $redis = null;
    private static $useFileCache = false;
    private static $cacheDir = null;
    private static $defaultTTL = 3600; // 1 hour
    
    /**
     * Initialize cache connection
     */
    private static function init() {
        if (self::$redis !== null || self::$useFileCache) {
            return;
        }
        
        self::$cacheDir = __DIR__ . '/../../cache';
        
        // Try Redis first
        if (class_exists('Redis')) {
            try {
                self::$redis = new Redis();
                $host = $_ENV['REDIS_HOST'] ?? 'localhost';
                $port = (int)($_ENV['REDIS_PORT'] ?? 6379);
                
                if (self::$redis->connect($host, $port, 2.0)) {
                    // Test connection
                    self::$redis->ping();
                    return;
                }
            } catch (Exception $e) {
                Logger::warning('Redis connection failed, using file cache', ['error' => $e->getMessage()]);
            }
        }
        
        // Fall back to file cache
        self::$useFileCache = true;
        self::$redis = null;
        
        if (!is_dir(self::$cacheDir)) {
            mkdir(self::$cacheDir, 0755, true);
        }
    }
    
    /**
     * Get cached value
     * @param string $key Cache key
     * @return mixed|null Cached value or null if not found
     */
    public static function get($key) {
        self::init();
        
        if (self::$redis) {
            $value = self::$redis->get($key);
            if ($value === false) {
                return null;
            }
            return unserialize($value);
        }
        
        // File cache
        $file = self::getCacheFile($key);
        if (!file_exists($file)) {
            return null;
        }
        
        $data = json_decode(file_get_contents($file), true);
        if (!$data || $data['expires'] < time()) {
            unlink($file);
            return null;
        }
        
        return unserialize($data['value']);
    }
    
    /**
     * Set cached value
     * @param string $key Cache key
     * @param mixed $value Value to cache
     * @param int $ttl Time to live in seconds
     * @return bool Success
     */
    public static function set($key, $value, $ttl = null) {
        self::init();
        
        $ttl = $ttl ?? self::$defaultTTL;
        
        if (self::$redis) {
            return self::$redis->setex($key, $ttl, serialize($value));
        }
        
        // File cache
        $file = self::getCacheFile($key);
        $data = [
            'expires' => time() + $ttl,
            'value' => serialize($value)
        ];
        
        return file_put_contents($file, json_encode($data)) !== false;
    }
    
    /**
     * Delete cached value
     * @param string $key Cache key
     * @return bool Success
     */
    public static function delete($key) {
        self::init();
        
        if (self::$redis) {
            return self::$redis->del($key) > 0;
        }
        
        // File cache
        $file = self::getCacheFile($key);
        if (file_exists($file)) {
            return unlink($file);
        }
        return true;
    }
    
    /**
     * Delete all keys matching a pattern
     * @param string $pattern Pattern with * wildcard
     * @return int Number of keys deleted
     */
    public static function deletePattern($pattern) {
        self::init();
        
        $count = 0;
        
        if (self::$redis) {
            $keys = self::$redis->keys($pattern);
            if (!empty($keys)) {
                $count = self::$redis->del($keys);
            }
            return $count;
        }
        
        // File cache - convert pattern to regex
        $regex = '/^' . str_replace(['*', '/'], ['.*', '\/'], preg_quote($pattern, '/')) . '$/';
        $files = glob(self::$cacheDir . '/*.cache');
        
        foreach ($files as $file) {
            $key = basename($file, '.cache');
            $key = str_replace('_', '/', urldecode($key));
            
            if (preg_match($regex, $key)) {
                unlink($file);
                $count++;
            }
        }
        
        return $count;
    }
    
    /**
     * Check if key exists in cache
     * @param string $key Cache key
     * @return bool
     */
    public static function has($key) {
        self::init();
        
        if (self::$redis) {
            return self::$redis->exists($key);
        }
        
        $file = self::getCacheFile($key);
        if (!file_exists($file)) {
            return false;
        }
        
        $data = json_decode(file_get_contents($file), true);
        return $data && $data['expires'] >= time();
    }
    
    /**
     * Get or set cached value using callback
     * @param string $key Cache key
     * @param callable $callback Function to generate value if not cached
     * @param int $ttl Time to live in seconds
     * @return mixed Cached or generated value
     */
    public static function remember($key, callable $callback, $ttl = null) {
        $value = self::get($key);
        
        if ($value !== null) {
            return $value;
        }
        
        $value = $callback();
        self::set($key, $value, $ttl);
        
        return $value;
    }
    
    /**
     * Increment a counter
     * @param string $key Cache key
     * @param int $by Amount to increment
     * @return int New value
     */
    public static function increment($key, $by = 1) {
        self::init();
        
        if (self::$redis) {
            return self::$redis->incrBy($key, $by);
        }
        
        $value = self::get($key) ?? 0;
        $value += $by;
        self::set($key, $value);
        return $value;
    }
    
    /**
     * Flush all cache
     * @return bool Success
     */
    public static function flush() {
        self::init();
        
        if (self::$redis) {
            return self::$redis->flushDB();
        }
        
        // File cache
        $files = glob(self::$cacheDir . '/*.cache');
        foreach ($files as $file) {
            unlink($file);
        }
        return true;
    }
    
    /**
     * Get cache file path for a key
     * @param string $key Cache key
     * @return string File path
     */
    private static function getCacheFile($key) {
        $safeKey = urlencode(str_replace('/', '_', $key));
        return self::$cacheDir . '/' . $safeKey . '.cache';
    }
    
    /**
     * Clean up expired file cache entries
     * Should be called periodically via cron
     */
    public static function cleanup() {
        if (!self::$useFileCache) {
            return 0;
        }
        
        self::init();
        
        $count = 0;
        $files = glob(self::$cacheDir . '/*.cache');
        
        foreach ($files as $file) {
            $data = json_decode(file_get_contents($file), true);
            if (!$data || $data['expires'] < time()) {
                unlink($file);
                $count++;
            }
        }
        
        return $count;
    }
}

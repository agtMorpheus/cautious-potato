/**
 * asset-db.js
 * 
 * IndexedDB wrapper for persistent storage with query support.
 * Provides non-blocking async operations, transaction support, and backup/restore.
 */

// ============================================
// DATABASE CONFIGURATION
// ============================================

const DB_NAME = 'assetManagementDB';
const DB_VERSION = 1;
const STORE_NAMES = {
  ASSETS: 'assets',
  CIRCUITS: 'circuits',
  CONTRACTS: 'contracts',
  DOCUMENTS: 'documents',
  PICTURES: 'pictures',
  PROTOCOLS: 'protocols'
};

// ============================================
// DATABASE CLASS
// ============================================

/**
 * AssetDatabase - IndexedDB wrapper for asset management
 */
export class AssetDatabase {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.dbName = DB_NAME;
    this.version = DB_VERSION;
  }

  /**
   * Initialize the database
   * @returns {Promise<IDBDatabase>} Database instance
   */
  async init() {
    if (this.isReady && this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('✓ Asset IndexedDB initialized');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create assets store
        if (!db.objectStoreNames.contains(STORE_NAMES.ASSETS)) {
          const assetStore = db.createObjectStore(STORE_NAMES.ASSETS, { keyPath: 'id' });
          assetStore.createIndex('status', 'status', { unique: false });
          assetStore.createIndex('plant', 'plant', { unique: false });
          assetStore.createIndex('location', 'location', { unique: false });
          assetStore.createIndex('parentId', 'parentId', { unique: false });
          assetStore.createIndex('type', 'type', { unique: false });
          assetStore.createIndex('name', 'name', { unique: false });
          assetStore.createIndex('active', 'active', { unique: false });
        }

        // Create circuits store
        if (!db.objectStoreNames.contains(STORE_NAMES.CIRCUITS)) {
          const circuitStore = db.createObjectStore(STORE_NAMES.CIRCUITS, { keyPath: 'id' });
          circuitStore.createIndex('assetId', 'assetId', { unique: false });
          circuitStore.createIndex('status', 'status', { unique: false });
        }

        // Create contracts store
        if (!db.objectStoreNames.contains(STORE_NAMES.CONTRACTS)) {
          const contractStore = db.createObjectStore(STORE_NAMES.CONTRACTS, { keyPath: 'id' });
          contractStore.createIndex('assetId', 'assetId', { unique: false });
          contractStore.createIndex('status', 'status', { unique: false });
        }

        // Create documents store
        if (!db.objectStoreNames.contains(STORE_NAMES.DOCUMENTS)) {
          const documentStore = db.createObjectStore(STORE_NAMES.DOCUMENTS, { keyPath: 'id' });
          documentStore.createIndex('assetId', 'assetId', { unique: false });
          documentStore.createIndex('type', 'type', { unique: false });
        }

        // Create pictures store
        if (!db.objectStoreNames.contains(STORE_NAMES.PICTURES)) {
          const pictureStore = db.createObjectStore(STORE_NAMES.PICTURES, { keyPath: 'id' });
          pictureStore.createIndex('assetId', 'assetId', { unique: false });
          pictureStore.createIndex('type', 'type', { unique: false });
        }

        // Create protocols store
        if (!db.objectStoreNames.contains(STORE_NAMES.PROTOCOLS)) {
          const protocolStore = db.createObjectStore(STORE_NAMES.PROTOCOLS, { keyPath: 'id' });
          protocolStore.createIndex('assetId', 'assetId', { unique: false });
          protocolStore.createIndex('type', 'type', { unique: false });
          protocolStore.createIndex('result', 'result', { unique: false });
        }
        
        console.log('✓ Asset IndexedDB schema created/upgraded');
      };
    });
  }

  /**
   * Check if database is ready
   * @returns {boolean} Ready status
   */
  ready() {
    return this.isReady && this.db !== null;
  }

  /**
   * Close database connection
   * @returns {void}
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isReady = false;
      console.log('Asset IndexedDB connection closed');
    }
  }

  /**
   * Get current schema version
   * @returns {number} Version number
   */
  getVersion() {
    return this.version;
  }

  // ============================================
  // ASSET CRUD OPERATIONS
  // ============================================

  /**
   * Add a single asset
   * @param {Object} asset - Asset to add
   * @returns {Promise<Object>} Added asset
   */
  async addAsset(asset) {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    
    return new Promise((resolve, reject) => {
      const assetWithTimestamp = {
        ...asset,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      const request = store.add(assetWithTimestamp);
      request.onsuccess = () => resolve(assetWithTimestamp);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add multiple assets in a single transaction
   * @param {Array} assets - Assets to add
   * @returns {Promise<Array>} Added assets
   */
  async addAssets(assets) {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    
    return new Promise((resolve, reject) => {
      const results = [];
      const skipped = [];
      const timestamp = new Date().toISOString();
      
      assets.forEach(asset => {
        const assetWithTimestamp = {
          ...asset,
          createdAt: asset.createdAt || timestamp,
          lastUpdated: timestamp
        };
        
        // Use add() to prevent overwriting existing assets
        // This will fail silently for duplicates (handled by onerror)
        const request = store.add(assetWithTimestamp);
        request.onsuccess = () => results.push(assetWithTimestamp);
        request.onerror = (e) => {
          // ConstraintError means duplicate key - skip silently
          if (e.target.error?.name === 'ConstraintError') {
            skipped.push(asset.id);
            e.preventDefault(); // Prevent transaction abort
          } else {
            console.error(`Failed to add ${asset.id}:`, e.target.error);
          }
        };
      });
      
      tx.oncomplete = () => {
        if (skipped.length > 0) {
          console.log(`Skipped ${skipped.length} duplicate assets during import`);
        }
        resolve(results);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get a single asset by ID
   * @param {string} id - Asset ID
   * @returns {Promise<Object|null>} Asset or null
   */
  async getAsset(id) {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readonly');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all assets (active only)
   * @returns {Promise<Array>} Array of assets
   */
  async getAllAssets() {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readonly');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const assets = request.result.filter(a => a.active !== false);
        resolve(assets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update an asset
   * @param {string} id - Asset ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated asset
   */
  async updateAsset(id, updates) {
    await this.ensureReady();
    
    // Get existing asset
    const existing = await this.getAsset(id);
    if (!existing) {
      throw new Error(`Asset not found: ${id}`);
    }
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    
    return new Promise((resolve, reject) => {
      const updated = {
        ...existing,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      
      const request = store.put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete an asset (soft delete)
   * @param {string} id - Asset ID
   * @returns {Promise<boolean>} Success
   */
  async deleteAsset(id) {
    await this.ensureReady();
    
    try {
      await this.updateAsset(id, { active: false });
      return true;
    } catch (error) {
      console.error(`Failed to delete asset ${id}:`, error);
      return false;
    }
  }

  /**
   * Permanently remove an asset
   * @param {string} id - Asset ID
   * @returns {Promise<boolean>} Success
   */
  async removeAsset(id) {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Query assets by status
   * @param {string} status - Status to filter by
   * @returns {Promise<Array>} Matching assets
   */
  async queryByStatus(status) {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readonly');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    const index = store.index('status');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => {
        const assets = request.result.filter(a => a.active !== false);
        resolve(assets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query assets by plant
   * @param {string} plant - Plant to filter by
   * @returns {Promise<Array>} Matching assets
   */
  async queryByPlant(plant) {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readonly');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    const index = store.index('plant');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(plant);
      request.onsuccess = () => {
        const assets = request.result.filter(a => a.active !== false);
        resolve(assets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query assets by location
   * @param {string} location - Location to filter by
   * @returns {Promise<Array>} Matching assets
   */
  async queryByLocation(location) {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readonly');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    const index = store.index('location');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(location);
      request.onsuccess = () => {
        const assets = request.result.filter(a => a.active !== false);
        resolve(assets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query assets by parent ID (for hierarchy)
   * @param {string} parentId - Parent asset ID
   * @returns {Promise<Array>} Child assets
   */
  async queryByParent(parentId) {
    await this.ensureReady();
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readonly');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    const index = store.index('parentId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(parentId);
      request.onsuccess = () => {
        const assets = request.result.filter(a => a.active !== false);
        resolve(assets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search assets by text query
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching assets
   */
  async search(query) {
    const allAssets = await this.getAllAssets();
    
    if (!query || query.trim() === '') {
      return allAssets;
    }
    
    const q = query.toLowerCase().trim();
    return allAssets.filter(asset =>
      (asset.id && asset.id.toLowerCase().includes(q)) ||
      (asset.name && asset.name.toLowerCase().includes(q)) ||
      (asset.description && asset.description.toLowerCase().includes(q)) ||
      (asset.location && asset.location.toLowerCase().includes(q)) ||
      (asset.plant && asset.plant.toLowerCase().includes(q))
    );
  }

  // ============================================
  // BACKUP AND RESTORE
  // ============================================

  /**
   * Export all data for backup
   * @returns {Promise<Object>} Backup data
   */
  async backup() {
    await this.ensureReady();
    
    const assets = await this.getAllAssets();
    
    return {
      version: this.version,
      exportedAt: new Date().toISOString(),
      assets: assets,
      statistics: {
        totalAssets: assets.length,
        byStatus: this.countByField(assets, 'status'),
        byPlant: this.countByField(assets, 'plant')
      }
    };
  }

  /**
   * Restore data from backup
   * @param {Object} data - Backup data
   * @returns {Promise<number>} Number of restored assets
   */
  async restore(data) {
    await this.ensureReady();
    
    if (!data || !data.assets) {
      throw new Error('Invalid backup data');
    }
    
    const tx = this.db.transaction(STORE_NAMES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.ASSETS);
    
    // Clear existing data
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Add backup data
    return new Promise((resolve, reject) => {
      data.assets.forEach(asset => {
        store.add(asset);
      });
      
      tx.oncomplete = () => resolve(data.assets.length);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Clear all data
   * @returns {Promise<void>}
   */
  async clear() {
    await this.ensureReady();
    
    const storeNames = Object.values(STORE_NAMES);
    const tx = this.db.transaction(storeNames, 'readwrite');
    
    return new Promise((resolve, reject) => {
      storeNames.forEach(storeName => {
        tx.objectStore(storeName).clear();
      });
      
      tx.oncomplete = () => {
        console.log('Asset IndexedDB cleared');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Ensure database is ready
   * @returns {Promise<void>}
   */
  async ensureReady() {
    if (!this.isReady) {
      await this.init();
    }
  }

  /**
   * Count items by field value
   * @param {Array} items - Items to count
   * @param {string} field - Field to group by
   * @returns {Object} Counts by field value
   */
  countByField(items, field) {
    return items.reduce((acc, item) => {
      const value = item[field] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }
}

// Export singleton instance
export default new AssetDatabase();

console.log('✓ Asset DB module loaded');

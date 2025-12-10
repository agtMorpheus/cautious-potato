/**
 * asset-db.js
 * 
 * IndexedDB wrapper for persistent storage of asset data.
 * Provides async CRUD operations with query support.
 * 
 * Features:
 * - Non-blocking async operations
 * - Transaction support for data integrity
 * - Index-based queries for performance
 * - Backup and restore capabilities
 */

// ============================================
// DATABASE CONFIGURATION
// ============================================

const DB_NAME = 'assetManagementDB';
const DB_VERSION = 1;

const STORES = {
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

export class AssetDatabase {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.dbName = DB_NAME;
    this.version = DB_VERSION;
  }

  /**
   * Initialize and open the database
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('✓ Asset Database initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createStores(db);
      };
    });
  }

  /**
   * Create object stores and indexes
   * @param {IDBDatabase} db - Database instance
   */
  createStores(db) {
    // Assets store
    if (!db.objectStoreNames.contains(STORES.ASSETS)) {
      const assetStore = db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
      assetStore.createIndex('status', 'status', { unique: false });
      assetStore.createIndex('plant', 'plant', { unique: false });
      assetStore.createIndex('location', 'location', { unique: false });
      assetStore.createIndex('parentId', 'parentId', { unique: false });
      assetStore.createIndex('type', 'type', { unique: false });
      assetStore.createIndex('name', 'name', { unique: false });
      assetStore.createIndex('active', 'active', { unique: false });
    }

    // Circuits store
    if (!db.objectStoreNames.contains(STORES.CIRCUITS)) {
      const circuitStore = db.createObjectStore(STORES.CIRCUITS, { keyPath: 'id' });
      circuitStore.createIndex('assetId', 'assetId', { unique: false });
      circuitStore.createIndex('status', 'status', { unique: false });
      circuitStore.createIndex('type', 'type', { unique: false });
    }

    // Contracts store
    if (!db.objectStoreNames.contains(STORES.CONTRACTS)) {
      const contractStore = db.createObjectStore(STORES.CONTRACTS, { keyPath: 'id' });
      contractStore.createIndex('assetId', 'assetId', { unique: false });
      contractStore.createIndex('status', 'status', { unique: false });
      contractStore.createIndex('type', 'type', { unique: false });
    }

    // Documents store
    if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
      const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
      docStore.createIndex('assetId', 'assetId', { unique: false });
      docStore.createIndex('type', 'type', { unique: false });
    }

    // Pictures store
    if (!db.objectStoreNames.contains(STORES.PICTURES)) {
      const picStore = db.createObjectStore(STORES.PICTURES, { keyPath: 'id' });
      picStore.createIndex('assetId', 'assetId', { unique: false });
      picStore.createIndex('type', 'type', { unique: false });
    }

    // Protocols store
    if (!db.objectStoreNames.contains(STORES.PROTOCOLS)) {
      const protocolStore = db.createObjectStore(STORES.PROTOCOLS, { keyPath: 'id' });
      protocolStore.createIndex('assetId', 'assetId', { unique: false });
      protocolStore.createIndex('type', 'type', { unique: false });
      protocolStore.createIndex('result', 'result', { unique: false });
    }

    console.log('✓ Asset Database stores created');
  }

  /**
   * Check if database is ready
   * @returns {boolean}
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
      console.log('Asset Database closed');
    }
  }

  /**
   * Get current schema version
   * @returns {number}
   */
  getVersion() {
    return this.version;
  }

  // ============================================
  // ASSET OPERATIONS
  // ============================================

  /**
   * Add a single asset
   * @param {Object} asset - Asset object
   * @returns {Promise<Object>}
   */
  async addAsset(asset) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORES.ASSETS);

    return new Promise((resolve, reject) => {
      const record = {
        ...asset,
        createdAt: asset.createdAt || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      const request = store.add(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add multiple assets in a single transaction
   * @param {Array} assets - Array of asset objects
   * @returns {Promise<Array>}
   */
  async addAssets(assets) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORES.ASSETS);

    return new Promise((resolve, reject) => {
      const results = [];
      const timestamp = new Date().toISOString();

      assets.forEach(asset => {
        const record = {
          ...asset,
          createdAt: asset.createdAt || timestamp,
          lastUpdated: timestamp
        };
        
        const request = store.add(record);
        request.onsuccess = () => results.push(record);
        request.onerror = () => console.error(`Failed to add ${asset.id}:`, request.error);
      });

      tx.oncomplete = () => resolve(results);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Update an existing asset
   * @param {string} id - Asset ID
   * @param {Object} updates - Updated fields
   * @returns {Promise<Object>}
   */
  async updateAsset(id, updates) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const existing = await this.getAsset(id);
    if (!existing) {
      throw new Error(`Asset not found: ${id}`);
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORES.ASSETS);

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
   * Delete an asset
   * @param {string} id - Asset ID
   * @returns {Promise<void>}
   */
  async deleteAsset(id) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORES.ASSETS);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a single asset by ID
   * @param {string} id - Asset ID
   * @returns {Promise<Object|null>}
   */
  async getAsset(id) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readonly');
    const store = tx.objectStore(STORES.ASSETS);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all assets (active only)
   * @returns {Promise<Array>}
   */
  async getAllAssets() {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readonly');
    const store = tx.objectStore(STORES.ASSETS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.filter(a => a.active !== false);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Query assets by status
   * @param {string} status - Status to filter by
   * @returns {Promise<Array>}
   */
  async queryByStatus(status) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readonly');
    const store = tx.objectStore(STORES.ASSETS);
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => {
        const results = request.result.filter(a => a.active !== false);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query assets by plant
   * @param {string} plant - Plant to filter by
   * @returns {Promise<Array>}
   */
  async queryByPlant(plant) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readonly');
    const store = tx.objectStore(STORES.ASSETS);
    const index = store.index('plant');

    return new Promise((resolve, reject) => {
      const request = index.getAll(plant);
      request.onsuccess = () => {
        const results = request.result.filter(a => a.active !== false);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query assets by location
   * @param {string} location - Location to filter by
   * @returns {Promise<Array>}
   */
  async queryByLocation(location) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readonly');
    const store = tx.objectStore(STORES.ASSETS);
    const index = store.index('location');

    return new Promise((resolve, reject) => {
      const request = index.getAll(location);
      request.onsuccess = () => {
        const results = request.result.filter(a => a.active !== false);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query assets by parent ID
   * @param {string} parentId - Parent asset ID
   * @returns {Promise<Array>}
   */
  async queryByParent(parentId) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.ASSETS, 'readonly');
    const store = tx.objectStore(STORES.ASSETS);
    const index = store.index('parentId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(parentId);
      request.onsuccess = () => {
        const results = request.result.filter(a => a.active !== false);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Full-text search across assets
   * @param {string} query - Search query
   * @returns {Promise<Array>}
   */
  async search(query) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const q = query.toLowerCase();
    const allAssets = await this.getAllAssets();

    return allAssets.filter(asset =>
      asset.id?.toLowerCase().includes(q) ||
      asset.name?.toLowerCase().includes(q) ||
      asset.description?.toLowerCase().includes(q) ||
      asset.location?.toLowerCase().includes(q) ||
      asset.plant?.toLowerCase().includes(q)
    );
  }

  // ============================================
  // RELATED DATA OPERATIONS
  // ============================================

  /**
   * Get circuits for an asset
   * @param {string} assetId - Asset ID
   * @returns {Promise<Array>}
   */
  async getCircuitsByAsset(assetId) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.CIRCUITS, 'readonly');
    const store = tx.objectStore(STORES.CIRCUITS);
    const index = store.index('assetId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(assetId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add a circuit
   * @param {Object} circuit - Circuit object
   * @returns {Promise<Object>}
   */
  async addCircuit(circuit) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(STORES.CIRCUITS, 'readwrite');
    const store = tx.objectStore(STORES.CIRCUITS);

    return new Promise((resolve, reject) => {
      const record = {
        ...circuit,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      const request = store.add(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // BACKUP & RESTORE
  // ============================================

  /**
   * Create a backup of all data
   * @returns {Promise<Object>}
   */
  async backup() {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const assets = await this.getAllAssets();
    
    // Get all related data
    const getAllFromStore = (storeName) => {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    };

    const [circuits, contracts, documents, pictures, protocols] = await Promise.all([
      getAllFromStore(STORES.CIRCUITS),
      getAllFromStore(STORES.CONTRACTS),
      getAllFromStore(STORES.DOCUMENTS),
      getAllFromStore(STORES.PICTURES),
      getAllFromStore(STORES.PROTOCOLS)
    ]);

    return {
      version: this.version,
      exportedAt: new Date().toISOString(),
      assets,
      circuits,
      contracts,
      documents,
      pictures,
      protocols
    };
  }

  /**
   * Restore data from a backup
   * @param {Object} data - Backup data
   * @returns {Promise<number>} Number of assets restored
   */
  async restore(data) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    // Clear existing data
    await this.clearAll();

    // Restore assets
    if (data.assets?.length > 0) {
      await this.addAssets(data.assets);
    }

    // Restore circuits
    if (data.circuits?.length > 0) {
      for (const circuit of data.circuits) {
        await this.addCircuit(circuit);
      }
    }

    return data.assets?.length || 0;
  }

  /**
   * Clear all data from database
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const storeNames = [
      STORES.ASSETS,
      STORES.CIRCUITS,
      STORES.CONTRACTS,
      STORES.DOCUMENTS,
      STORES.PICTURES,
      STORES.PROTOCOLS
    ];

    const tx = this.db.transaction(storeNames, 'readwrite');

    return new Promise((resolve, reject) => {
      storeNames.forEach(storeName => {
        tx.objectStore(storeName).clear();
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Run a transaction with callback
   * @param {Function} callback - Transaction callback
   * @returns {Promise<*>}
   */
  async transaction(callback) {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    return callback(this.db);
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    if (!this.ready()) {
      throw new Error('Database not initialized');
    }

    const [assets, circuits] = await Promise.all([
      this.getAllAssets(),
      new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORES.CIRCUITS, 'readonly');
        const request = tx.objectStore(STORES.CIRCUITS).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
    ]);

    return {
      totalAssets: assets.length,
      totalCircuits: circuits,
      byStatus: assets.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {}),
      byPlant: assets.reduce((acc, a) => {
        if (a.plant) acc[a.plant] = (acc[a.plant] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Export singleton instance
const db = new AssetDatabase();
export default db;

console.log('✓ Asset Database module loaded');

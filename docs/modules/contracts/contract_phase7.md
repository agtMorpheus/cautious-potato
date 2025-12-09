# Contract Manager Module – Phase 7: Mobile Application & Cross-Platform Deployment

**Duration:** Weeks 13–16  
**Status:** Planned  
**Last Updated:** December 9, 2025

---

## 1. Overview

Phase 7 extends the Contract Manager to **mobile platforms** while maintaining **single codebase** where possible. This phase enables field teams, managers, and executives to access and manage contracts from **iOS, Android, and web** with seamless synchronization and offline-first architecture.

Phase 7 objectives:

1. **Mobile App Architecture** – Shared business logic across platforms
2. **Offline-First Synchronization** – Local data cache with intelligent sync
3. **Native Mobile UX** – Platform-specific UI patterns (iOS, Android)
4. **Push Notifications** – Real-time alerts on mobile devices
5. **Mobile Authentication** – Biometric login, session management
6. **Responsive Web Design** – Optimize web app for mobile browsers
7. **Cross-Platform Testing** – iOS, Android, mobile web testing
8. **Performance Optimization** – Battery, network, storage optimization
9. **App Distribution** – App Store, Google Play, enterprise deployment
10. **Analytics** – Mobile-specific usage tracking

---

## 2. Technology Stack for Mobile

### 2.1 Technology Selection Matrix

| Component | Option 1 | Option 2 | Option 3 | Selected |
|-----------|----------|----------|----------|----------|
| **Framework** | React Native | Flutter | Native (Swift/Kotlin) | React Native |
| **State Management** | Redux | Riverpod | Provider | Redux |
| **Local DB** | SQLite | Realm | Firebase Realtime | SQLite |
| **API Client** | Axios | Dio | Native HTTP | Axios |
| **Push Notifications** | Firebase Cloud Messaging | OneSignal | Custom | FCM |
| **Auth** | Firebase Auth | Custom JWT | Native OS | Custom JWT |
| **Analytics** | Firebase Analytics | Mixpanel | Segment | Firebase |

### 2.2 Why React Native?

- **Code Sharing:** 70-80% shared code between iOS and Android
- **Time-to-Market:** Single codebase = faster deployment
- **Team Skills:** JavaScript already used in web app
- **Community:** Large ecosystem, well-documented
- **Performance:** Close to native (can optimize critical paths)
- **XAMPP Integration:** Easy to connect to existing REST API

### 2.3 Project Structure

```
contract-manager-mobile/
├── apps/
│   ├── web/                    # Web app (Phases 1-6)
│   └── mobile/                 # React Native app (Phase 7)
│       ├── android/            # Android native code
│       ├── ios/                # iOS native code
│       └── src/
│           ├── screens/        # Screen components
│           ├── components/     # Reusable components
│           ├── navigation/     # Navigation logic
│           ├── redux/          # State management
│           ├── api/            # API client (shared)
│           ├── db/             # SQLite integration
│           ├── utils/          # Utilities (shared with web)
│           ├── types/          # TypeScript types
│           └── App.tsx         # Root component
├── shared/                     # Shared business logic
│   ├── models/
│   ├── validators/
│   └── utils/
└── package.json
```

---

## 3. Offline-First Architecture

### 3.1 Local Database Setup (SQLite)

**File:** `src/db/sqlite-setup.ts`

```typescript
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const DATABASE_NAME = 'contract_manager.db';
const DATABASE_VERSION = 1;

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: DATABASE_NAME,
        location: 'default'
      });

      await this.createTables();
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        auftrag TEXT NOT NULL UNIQUE,
        titel TEXT NOT NULL,
        standort TEXT,
        saeule_raum TEXT,
        anlage_nr TEXT,
        beschreibung TEXT,
        status TEXT DEFAULT 'offen',
        sollstart TEXT,
        workorder_code TEXT,
        melder TEXT,
        seriennummer TEXT,
        is_complete BOOLEAN DEFAULT 0,
        
        created_at TEXT,
        updated_at TEXT,
        created_by INTEGER,
        updated_by INTEGER,
        synced BOOLEAN DEFAULT 0,
        sync_failed BOOLEAN DEFAULT 0,
        deleted_locally BOOLEAN DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS contract_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id TEXT NOT NULL,
        field_name TEXT,
        old_value TEXT,
        new_value TEXT,
        changed_by INTEGER,
        changed_at TEXT,
        synced BOOLEAN DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS pending_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_type TEXT,
        resource_type TEXT,
        resource_id TEXT,
        data TEXT,
        created_at TEXT,
        synced BOOLEAN DEFAULT 0,
        error_message TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        last_sync_time TEXT,
        last_successful_sync TEXT,
        pending_count INTEGER DEFAULT 0,
        conflict_count INTEGER DEFAULT 0
      )`
    ];

    for (const sql of tables) {
      try {
        await this.db?.executeSql(sql);
      } catch (error) {
        if (!String(error).includes('already exists')) {
          throw error;
        }
      }
    }
  }

  // Contract CRUD operations
  async createContract(contract: Contract): Promise<void> {
    const sql = `
      INSERT INTO contracts (
        id, auftrag, titel, standort, saeule_raum, anlage_nr,
        beschreibung, status, sollstart, workorder_code, melder,
        seriennummer, is_complete, created_at, updated_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      contract.id, contract.auftrag, contract.titel, contract.standort,
      contract.saeule_raum, contract.anlage_nr, contract.beschreibung,
      contract.status, contract.sollstart, contract.workorder_code,
      contract.melder, contract.seriennummer, contract.is_complete,
      contract.created_at, contract.updated_at, false
    ];

    await this.db?.executeSql(sql, values);
  }

  async updateContract(id: string, updates: Partial<Contract>): Promise<void> {
    const fields = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.values(updates);
    values.push(id);

    const sql = `UPDATE contracts SET ${fields}, updated_at = ?, synced = 0 WHERE id = ?`;
    values.splice(values.length - 1, 0, new Date().toISOString());

    await this.db?.executeSql(sql, values);
  }

  async getContract(id: string): Promise<Contract | null> {
    const sql = 'SELECT * FROM contracts WHERE id = ?';
    const result = await this.db?.executeSql(sql, [id]);
    return result?.rows.length ? result.rows.item(0) : null;
  }

  async getContractsPaginated(limit: number = 50, offset: number = 0): Promise<Contract[]> {
    const sql = `
      SELECT * FROM contracts 
      WHERE deleted_locally = 0 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    const result = await this.db?.executeSql(sql, [limit, offset]);
    const contracts: Contract[] = [];
    for (let i = 0; i < result!.rows.length; i++) {
      contracts.push(result!.rows.item(i));
    }
    return contracts;
  }

  async searchContracts(query: string): Promise<Contract[]> {
    const searchTerm = `%${query}%`;
    const sql = `
      SELECT * FROM contracts 
      WHERE deleted_locally = 0 
      AND (auftrag LIKE ? OR titel LIKE ? OR standort LIKE ?)
      ORDER BY auftrag ASC
    `;
    const result = await this.db?.executeSql(sql, [searchTerm, searchTerm, searchTerm]);
    const contracts: Contract[] = [];
    for (let i = 0; i < result!.rows.length; i++) {
      contracts.push(result!.rows.item(i));
    }
    return contracts;
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    const sql = 'SELECT * FROM pending_operations WHERE synced = 0 ORDER BY created_at ASC';
    const result = await this.db?.executeSql(sql);
    const operations: PendingOperation[] = [];
    for (let i = 0; i < result!.rows.length; i++) {
      operations.push(result!.rows.item(i));
    }
    return operations;
  }
}

export const dbService = new DatabaseService();
```

### 3.2 Sync Engine

**File:** `src/sync/SyncEngine.ts`

```typescript
import { apiClient } from '../api/apiClient';
import { dbService } from '../db/sqlite-setup';
import { syncQueue } from './SyncQueue';

export class SyncEngine {
  private isSyncing = false;
  private lastSyncTime: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  async startSync(): Promise<void> {
    // Start periodic sync (every 5 minutes when online)
    this.syncInterval = setInterval(() => {
      if (this.isOnline()) {
        this.syncNow();
      }
    }, 5 * 60 * 1000);

    // Sync on app foreground
    this.registerAppStateListener();
  }

  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, reason: 'already_syncing' };
    }

    this.isSyncing = true;

    try {
      // Step 1: Pull remote changes
      await this.pullRemoteChanges();

      // Step 2: Push local changes
      await this.pushLocalChanges();

      // Step 3: Resolve conflicts
      await this.resolveConflicts();

      this.lastSyncTime = new Date();

      return { success: true, lastSyncTime: this.lastSyncTime };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error: String(error) };
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullRemoteChanges(): Promise<void> {
    try {
      const timestamp = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Fetch updated contracts from server
      const response = await apiClient.getContractsUpdatedSince(timestamp);

      for (const contract of response.contracts) {
        const local = await dbService.getContract(contract.id);

        if (!local) {
          // New contract: insert
          await dbService.createContract(contract);
        } else if (new Date(contract.updated_at) > new Date(local.updated_at)) {
          // Remote is newer: update
          await dbService.updateContract(contract.id, contract);
        }
        // If local is newer, don't overwrite (conflict, handle in resolveConflicts)
      }

      // Fetch deleted contracts (soft delete flag)
      const deleted = response.deleted_contract_ids || [];
      for (const id of deleted) {
        await dbService.markContractDeleted(id);
      }

      console.log(`Pulled ${response.contracts.length} contracts from server`);
    } catch (error) {
      console.error('Failed to pull remote changes:', error);
      throw error;
    }
  }

  private async pushLocalChanges(): Promise<void> {
    const operations = await dbService.getPendingOperations();

    if (operations.length === 0) {
      console.log('No pending operations');
      return;
    }

    for (const op of operations) {
      try {
        let response;

        switch (op.operation_type) {
          case 'CREATE':
            response = await apiClient.createContract(JSON.parse(op.data));
            break;

          case 'UPDATE':
            const [id, updates] = JSON.parse(op.data);
            response = await apiClient.updateContract(id, updates);
            break;

          case 'DELETE':
            await apiClient.deleteContract(op.resource_id);
            break;
        }

        // Mark operation as synced
        await dbService.markOperationSynced(op.id);
        console.log(`Synced ${op.operation_type} for ${op.resource_id}`);

      } catch (error) {
        console.error(`Failed to sync ${op.operation_type} for ${op.resource_id}:`, error);
        await dbService.markOperationFailed(op.id, String(error));
      }
    }
  }

  private async resolveConflicts(): Promise<void> {
    // Conflict resolution strategy:
    // 1. Server wins (simpler for most cases)
    // 2. Last write wins (more complex, requires timestamps)
    // 3. User resolution (show UI dialog)

    // For MVP, use "server wins" strategy
    const conflicts = await dbService.getConflicts();

    for (const conflict of conflicts) {
      // Delete local version (will be replaced by server on next pull)
      await dbService.deleteContractLocally(conflict.id);
    }

    console.log(`Resolved ${conflicts.length} conflicts`);
  }

  private isOnline(): boolean {
    // Platform-specific: NetInfo, etc.
    return navigator.onLine;
  }

  private registerAppStateListener(): void {
    // React Native: AppState
    // Web: online/offline events
  }

  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export interface SyncResult {
  success: boolean;
  lastSyncTime?: Date;
  reason?: string;
  error?: string;
}
```

### 3.3 Pending Operations Queue

**File:** `src/sync/SyncQueue.ts`

```typescript
import { dbService } from '../db/sqlite-setup';

export class SyncQueue {
  /**
   * Queue a local operation for later sync
   */
  async enqueue(
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceType: string,
    resourceId: string,
    data?: any
  ): Promise<void> {
    const sql = `
      INSERT INTO pending_operations (operation_type, resource_type, resource_id, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await dbService.execute(sql, [
      operationType,
      resourceType,
      resourceId,
      JSON.stringify(data),
      new Date().toISOString()
    ]);
  }

  /**
   * Get all pending operations
   */
  async getPending(): Promise<PendingOperation[]> {
    return dbService.getPendingOperations();
  }

  /**
   * Mark operation as synced
   */
  async markSynced(operationId: number): Promise<void> {
    const sql = 'UPDATE pending_operations SET synced = 1 WHERE id = ?';
    await dbService.execute(sql, [operationId]);
  }

  /**
   * Mark operation as failed
   */
  async markFailed(operationId: number, errorMessage: string): Promise<void> {
    const sql = 'UPDATE pending_operations SET sync_failed = 1, error_message = ? WHERE id = ?';
    await dbService.execute(sql, [errorMessage, operationId]);
  }

  /**
   * Retry failed operations
   */
  async retryFailed(): Promise<number> {
    const sql = 'UPDATE pending_operations SET sync_failed = 0 WHERE sync_failed = 1';
    await dbService.execute(sql, []);
    return this.getPending().then(ops => ops.length);
  }
}

export const syncQueue = new SyncQueue();
```

---

## 4. Mobile UI Architecture

### 4.1 Navigation Structure

**File:** `src/navigation/RootNavigator.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AuthContext } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ContractListScreen from '../screens/contracts/ContractListScreen';
import ContractDetailScreen from '../screens/contracts/ContractDetailScreen';
import ContractEditScreen from '../screens/contracts/ContractEditScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ImportScreen from '../screens/import/ImportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export function RootNavigator() {
  const { state, dispatch } = useAuth();

  useEffect(() => {
    // Check if user is already logged in
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      // Try to restore token from secure storage
      const userToken = await getStoredToken();
      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    } catch (e) {
      dispatch({ type: 'RESTORE_TOKEN', token: null });
    }
  };

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {state.userToken == null ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animationEnabled: false
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      ) : (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'ContractList') {
                iconName = focused ? 'list' : 'list-outline';
              } else if (route.name === 'Dashboard') {
                iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              } else if (route.name === 'Import') {
                iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              }
              // Return icon component
            },
            headerTitleStyle: { fontWeight: '600' }
          })}
        >
          <Tab.Screen
            name="ContractList"
            component={ContractListStack}
            options={{ title: 'Verträge' }}
          />
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: 'Dashboard' }}
          />
          <Tab.Screen
            name="Import"
            component={ImportScreen}
            options={{ title: 'Importieren' }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Einstellungen' }}
          />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}

function ContractListStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ContractListScreen"
        component={ContractListScreen}
        options={{ title: 'Verträge' }}
      />
      <Stack.Screen
        name="ContractDetailScreen"
        component={ContractDetailScreen}
        options={{ title: 'Vertragsdetails' }}
      />
      <Stack.Screen
        name="ContractEditScreen"
        component={ContractEditScreen}
        options={{ title: 'Vertrags bearbeiten' }}
      />
    </Stack.Navigator>
  );
}
```

### 4.2 Contract List Screen (Mobile)

**File:** `src/screens/contracts/ContractListScreen.tsx`

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';

import { dbService } from '../../db/sqlite-setup';
import { syncEngine } from '../../sync/SyncEngine';
import { RootState } from '../../redux/store';

interface Contract {
  id: string;
  auftrag: string;
  titel: string;
  status: string;
  sollstart: string;
  synced: boolean;
}

export default function ContractListScreen({ navigation }: any) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [offset, setOffset] = useState(0);

  const syncStatus = useSelector((state: RootState) => state.sync.status);
  const syncError = useSelector((state: RootState) => state.sync.error);
  const dispatch = useDispatch();

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await dbService.getContractsPaginated(50, 0);
      setContracts(data);
      setFilteredContracts(data);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncEngine.syncNow();
      await loadContracts();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (text.length === 0) {
      setFilteredContracts(contracts);
    } else {
      const filtered = contracts.filter(
        contract =>
          contract.auftrag.toLowerCase().includes(text.toLowerCase()) ||
          contract.titel.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredContracts(filtered);
    }
  }, [contracts]);

  const handleEndReached = async () => {
    // Pagination
    const nextOffset = offset + 50;
    const moreContracts = await dbService.getContractsPaginated(50, nextOffset);
    if (moreContracts.length > 0) {
      setOffset(nextOffset);
      setContracts([...contracts, ...moreContracts]);
      setFilteredContracts([...filteredContracts, ...moreContracts]);
    }
  };

  const renderContractItem = ({ item }: { item: Contract }) => (
    <TouchableOpacity
      style={styles.contractCard}
      onPress={() => navigation.navigate('ContractDetailScreen', { contractId: item.id })}
    >
      <View style={styles.cardContent}>
        <Text style={styles.contractId}>{item.auftrag}</Text>
        <Text style={styles.contractTitle} numberOfLines={2}>
          {item.titel}
        </Text>
        <View style={styles.cardMeta}>
          <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          {!item.synced && (
            <Icon name="cloud-offline" size={16} color="#f59e0b" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && contracts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sync Status Bar */}
      {syncStatus === 'syncing' && (
        <View style={styles.syncBar}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.syncText}>Synchronisiere...</Text>
        </View>
      )}

      {syncError && (
        <View style={styles.errorBar}>
          <Icon name="alert-circle" size={16} color="#fff" />
          <Text style={styles.errorText}>{syncError}</Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Suchen..."
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
      </View>

      {/* Contract List */}
      <FlatList
        data={filteredContracts}
        renderItem={renderContractItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Keine Verträge gefunden</Text>
          </View>
        }
      />

      {/* FAB: Add/Import */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Import')}
      >
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  syncBar: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  syncText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  errorBar: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  errorText: {
    color: '#fff',
    fontSize: 14
  },
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 2
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80
  },
  contractCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
    elevation: 1,
    overflow: 'hidden'
  },
  cardContent: {
    padding: 16
  },
  contractId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4
  },
  contractTitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  status_offen: {
    backgroundColor: '#fee2e2'
  },
  status_inbearb: {
    backgroundColor: '#fef3c7'
  },
  status_fertig: {
    backgroundColor: '#dcfce7'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  }
});
```

---

## 5. Push Notifications

### 5.1 Firebase Cloud Messaging Setup

**File:** `src/notifications/NotificationService.ts`

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

export class NotificationService {
  private static instance: NotificationService | null = null;

  static getInstance(): NotificationService {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Request permission (iOS only)
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.warn('Notification permission not granted');
          return;
        }
      }

      // Get FCM token and send to backend
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      await this.registerDeviceToken(token);

      // Listen for token refresh
      messaging().onTokenRefresh(token => {
        console.log('FCM Token Refreshed:', token);
        this.registerDeviceToken(token);
      });

      // Handle foreground messages
      this.handleForegroundMessages();

      // Handle background messages (via handler in index.js)
      this.handleBackgroundMessages();

    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private handleForegroundMessages(): void {
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);

      // Display notification
      this.showLocalNotification({
        title: remoteMessage.notification?.title || 'Neue Benachrichtigung',
        body: remoteMessage.notification?.body || '',
        data: remoteMessage.data
      });

      // Dispatch Redux action if needed
      // dispatch({ type: 'NOTIFICATION_RECEIVED', payload: remoteMessage });
    });
  }

  private handleBackgroundMessages(): void {
    // Register background message handler in index.js instead:
    // messaging().setBackgroundMessageHandler(async (remoteMessage) => { ... });
  }

  private async showLocalNotification(notification: any): Promise<void> {
    // Use react-native-notifee or push-notification-ios
  }

  private async registerDeviceToken(token: string): Promise<void> {
    try {
      // Send token to backend API
      // await apiClient.registerDeviceToken(token);
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }
}

// Background message handler (in index.js)
export async function handleBackgroundMessage(remoteMessage: any) {
  console.log('Background message:', remoteMessage);
  // Update local cache if contract-related
  if (remoteMessage.data?.type === 'contract_updated') {
    const contractId = remoteMessage.data.contract_id;
    // Fetch updated contract from API
    // const contract = await apiClient.getContract(contractId);
    // await dbService.updateContract(contractId, contract);
  }
}
```

**In `index.js`:**

```javascript
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import { handleBackgroundMessage } from './src/notifications/NotificationService';

// Register background message handler
messaging().setBackgroundMessageHandler(handleBackgroundMessage);

AppRegistry.registerComponent('ContractManager', () => App);
```

### 5.2 Notification Types & Templates

```typescript
export interface NotificationTemplate {
  type: 'contract_updated' | 'approval_requested' | 'import_complete' | 'sync_failed';
  title: string;
  body: string;
  action?: string;
  data?: Record<string, any>;
}

export const notificationTemplates: Record<string, NotificationTemplate> = {
  contract_updated: {
    type: 'contract_updated',
    title: 'Vertrag aktualisiert',
    body: 'Der Vertrag {{auftrag}} wurde aktualisiert',
    action: 'view_contract',
    data: { contract_id: '{{id}}' }
  },

  approval_requested: {
    type: 'approval_requested',
    title: 'Genehmigung erforderlich',
    body: 'Der Vertrag {{auftrag}} wartet auf Ihre Genehmigung',
    action: 'approve_contract',
    data: { contract_id: '{{id}}' }
  },

  import_complete: {
    type: 'import_complete',
    title: 'Import abgeschlossen',
    body: '{{count}} Verträge erfolgreich importiert',
    data: { import_id: '{{id}}' }
  },

  sync_failed: {
    type: 'sync_failed',
    title: 'Synchronisierung fehlgeschlagen',
    body: 'Es gibt {{count}} ausstehende Änderungen zu synchronisieren'
  }
};

export function renderTemplate(
  template: NotificationTemplate,
  data: Record<string, any>
): NotificationTemplate {
  const rendered = { ...template };
  Object.keys(data).forEach(key => {
    rendered.title = rendered.title.replace(`{{${key}}}`, data[key]);
    rendered.body = rendered.body.replace(`{{${key}}}`, data[key]);
  });
  return rendered;
}
```

---

## 6. Biometric Authentication

**File:** `src/auth/BiometricAuth.ts`

```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export class BiometricAuth {
  private static readonly BIOMETRIC_TOKEN_KEY = 'biometric_token';

  static async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      return compatible;
    } catch {
      return false;
    }
  }

  static async saveBiometricToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.BIOMETRIC_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save biometric token:', error);
    }
  }

  static async authenticate(): Promise<string | null> {
    try {
      const authenticated = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: 'Authentifizieren Sie sich, um auf Verträge zuzugreifen'
      });

      if (authenticated.success) {
        // Retrieve stored token
        const token = await SecureStore.getItemAsync(this.BIOMETRIC_TOKEN_KEY);
        return token || null;
      }

      return null;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return null;
    }
  }

  static async removeBiometricToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.BIOMETRIC_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove biometric token:', error);
    }
  }
}
```

---

## 7. Performance & Battery Optimization

### 7.1 Battery Optimization

```typescript
// src/utils/BatteryOptimization.ts

import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

export function useBatteryOptimization(syncEngine: SyncEngine) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background') {
      // App moved to background
      // Reduce sync frequency, pause heavy operations
      syncEngine.pauseAutoSync();

      // Stop location tracking if enabled
      // Stop real-time updates
    } else if (nextAppState === 'active') {
      // App came to foreground
      // Resume normal sync
      syncEngine.resumeAutoSync();

      // Sync if enough time has passed
      const lastSync = syncEngine.getLastSyncTime();
      const now = new Date();
      if (now.getTime() - lastSync.getTime() > 5 * 60 * 1000) {
        syncEngine.syncNow();
      }
    }
  };
}

// Adaptive sync based on network type
export async function getAdaptiveSyncInterval(netInfo: any): Promise<number> {
  switch (netInfo.type) {
    case 'wifi':
      return 5 * 60 * 1000;  // Every 5 minutes on WiFi

    case 'cellular':
      return 30 * 60 * 1000;  // Every 30 minutes on cellular

    case 'unknown':
    default:
      return 60 * 60 * 1000;  // Every 60 minutes on unknown
  }
}
```

### 7.2 Network Optimization

```typescript
// src/api/NetworkOptimization.ts

export class NetworkOptimization {
  /**
   * Compress request/response bodies
   */
  static async compressRequest(data: any): Promise<string> {
    // Use gzip compression
    return compress(JSON.stringify(data));
  }

  /**
   * Only sync changed fields (delta sync)
   */
  static calculateDelta(oldContract: Contract, newContract: Contract): Partial<Contract> {
    const delta: Partial<Contract> = {};

    Object.keys(newContract).forEach(key => {
      if (oldContract[key] !== newContract[key]) {
        delta[key] = newContract[key];
      }
    });

    return delta;
  }

  /**
   * Bundle multiple operations into single request
   */
  static async bundleOperations(operations: any[]): Promise<any> {
    return {
      type: 'batch',
      operations: operations
    };
  }

  /**
   * Cache images locally
   */
  static async cacheImage(url: string): Promise<string> {
    const localPath = await ImageCache.get(url);
    return localPath;
  }
}
```

---

## 8. Testing Strategy for Mobile

### 8.1 Unit Testing

```typescript
// __tests__/SyncEngine.test.ts

import { SyncEngine } from '../src/sync/SyncEngine';
import { dbService } from '../src/db/sqlite-setup';
import * as apiClient from '../src/api/apiClient';

jest.mock('../src/db/sqlite-setup');
jest.mock('../src/api/apiClient');

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;

  beforeEach(() => {
    syncEngine = new SyncEngine();
    jest.clearAllMocks();
  });

  test('should pull remote changes', async () => {
    const mockContracts = [
      { id: '1', auftrag: 'A5664159', synced: false }
    ];

    (apiClient.getContractsUpdatedSince as jest.Mock).mockResolvedValue({
      contracts: mockContracts
    });

    (dbService.createContract as jest.Mock).mockResolvedValue(undefined);

    // Run test
    // ...
  });

  test('should push local changes', async () => {
    // Test implementation
  });

  test('should handle sync failures gracefully', async () => {
    (apiClient.getContractsUpdatedSince as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const result = await syncEngine.syncNow();
    expect(result.success).toBe(false);
  });
});
```

### 8.2 Integration Testing

```typescript
// __tests__/e2e/ContractFlow.e2e.ts

import detox from 'detox';

describe('Contract Management Flow', () => {
  beforeAll(async () => {
    await detox.init(__dirname, { launchApp: true });
  });

  beforeEach(async () => {
    await detox.device.reloadReactNative();
  });

  afterAll(async () => {
    await detox.cleanup();
  });

  it('should display contract list', async () => {
    await expect(element(by.id('contract-list'))).toBeVisible();
  });

  it('should search contracts', async () => {
    await element(by.id('search-input')).typeText('A564');
    await expect(element(by.text('A5664159'))).toBeVisible();
  });

  it('should open contract detail', async () => {
    await element(by.text('A5664159')).multiTap();
    await expect(element(by.id('contract-detail'))).toBeVisible();
  });

  it('should sync with backend', async () => {
    await element(by.id('sync-button')).multiTap();
    await expect(element(by.id('sync-indicator'))).not.toBeVisible();
  });
});
```

---

## 9. App Distribution

### 9.1 iOS Distribution (App Store)

**Checklist:**

- [ ] Create Apple Developer account
- [ ] Configure App ID and provisioning profiles
- [ ] Create app signing certificate
- [ ] Build release version: `eas build --platform ios --auto-submit`
- [ ] Create TestFlight build for beta testing
- [ ] Prepare App Store listing (screenshots, description, privacy policy)
- [ ] Submit for review
- [ ] Monitor review status and feedback

**Build configuration (app.json):**

```json
{
  "expo": {
    "name": "Contract Manager",
    "slug": "contract-manager",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.example.contractmanager",
      "buildNumber": "1",
      "supportsTabletMode": true,
      "infoPlist": {
        "UIRequiredDeviceCapabilities": ["nfc"],
        "NSLocalNetworkUsageDescription": "Required for local sync",
        "NSBonjourServices": ["_http._tcp", "_contractmanager._tcp"]
      }
    }
  }
}
```

### 9.2 Android Distribution (Google Play)

**Checklist:**

- [ ] Create Google Play Developer account
- [ ] Configure signing key
- [ ] Build release APK/AAB: `eas build --platform android --auto-submit`
- [ ] Create Play Store listing
- [ ] Prepare store assets (screenshots, video, description)
- [ ] Configure pricing and distribution
- [ ] Create closed beta track for testing
- [ ] Submit for review

**Build configuration:**

```json
{
  "expo": {
    "android": {
      "package": "com.example.contractmanager",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "USE_FINGERPRINT",
        "USE_BIOMETRIC"
      ],
      "playStoreAccount": {
        "serviceAccountKeyPath": "/path/to/service-account-key.json"
      }
    }
  }
}
```

### 9.3 Enterprise Deployment

For internal deployment (not via app stores):

**iOS:**
- Build and sign with enterprise certificate
- Create .ipa file
- Distribute via MDM (Mobile Device Management) like Microsoft Intune

**Android:**
- Build and sign APK with company key
- Distribute via internal app store or MDM

```bash
# Build for enterprise iOS
eas build --platform ios --profile=production

# Build for enterprise Android
eas build --platform android --profile=production
```

---

## 10. Phase 7 Deliverables Checklist

### Architecture & Setup

- [ ] React Native project initialized
- [ ] SQLite database schema created & tested
- [ ] Redux state management configured
- [ ] Navigation structure implemented (stack, tabs, drawers)
- [ ] API client integrated with mock endpoints
- [ ] Authentication context & providers setup

### Offline-First Features

- [ ] Local SQLite database working
- [ ] Sync engine pulling remote changes
- [ ] Sync engine pushing local changes
- [ ] Pending operations queue functional
- [ ] Conflict resolution strategy implemented
- [ ] Offline mode clearly indicated in UI

### Mobile UI Implementation

- [ ] Contract list screen (with search, filter, pagination)
- [ ] Contract detail screen
- [ ] Contract edit screen (inline editing)
- [ ] Dashboard screen (analytics, metrics)
- [ ] Settings screen (sync options, preferences)
- [ ] Login screen (with biometric option)
- [ ] All screens responsive & accessible

### Features

- [ ] Push notifications (FCM setup)
- [ ] Biometric authentication (fingerprint, face)
- [ ] Network detection & adaptive sync
- [ ] Battery optimization (app state listeners)
- [ ] Data compression & delta sync
- [ ] Image caching

### Testing & Quality

- [ ] Unit tests for core modules (SyncEngine, DatabaseService)
- [ ] Integration tests for workflows
- [ ] E2E tests with Detox
- [ ] Performance profiling (startup time, memory usage)
- [ ] Battery drain testing
- [ ] Network throttling tests
- [ ] Accessibility audit (WCAG on mobile)

### Deployment

- [ ] iOS build configured for App Store
- [ ] Android build configured for Google Play
- [ ] TestFlight/beta track setup
- [ ] Store listings created (screenshots, descriptions)
- [ ] Privacy policy updated
- [ ] Enterprise deployment package created

---

## 11. Performance Targets (Mobile)

| Metric | Target | Notes |
|--------|--------|-------|
| App startup time | < 3 seconds | On modern devices |
| Contract list load (50 items) | < 500 ms | From local DB |
| Search response | < 300 ms | Local DB search |
| Sync time (100 changes) | < 5 seconds | With network |
| Initial sync (all contracts) | < 30 seconds | First-time setup |
| Battery drain | < 2% per hour | Background sync enabled |
| Storage footprint | < 50 MB | For 10K contracts + app |

---

## 12. Known Limitations (Phase 7)

1. **React Native Limitations:**
   - Some native modules may require custom bridge code
   - Platform-specific bugs require platform-specific fixes

2. **Offline Limitations:**
   - Complex queries limited to SQLite capabilities
   - Large datasets may cause UI lag

3. **Sync Limitations:**
   - Last-write-wins conflict resolution (simple but not always ideal)
   - No real-time collaboration features yet

4. **Push Notification Limitations:**
   - Requires Firebase Cloud Messaging setup
   - iOS may have delivery delays in low-power mode

---

## 13. Future Enhancements (Phase 8)

- [ ] Offline mapping (contract editing without internet)
- [ ] Bluetooth sync (sync between nearby devices)
- [ ] Voice commands (Siri/Google Assistant integration)
- [ ] Augmented Reality (AR document annotation)
- [ ] Wearable app (Apple Watch, Wear OS)
- [ ] Real-time collaboration (multiple users editing simultaneously)

---

## 14. Sign-Off

**Document Version:** 1.0  
**Created:** December 9, 2025  
**Status:** Ready for Implementation  
**Author:** AI Research Agent  
**Approval:** (Pending stakeholder review)

---

**End of Phase 7 Specification**

**Contract Manager Module – 7-Phase Complete Roadmap (Phases 1–7) is finished!**

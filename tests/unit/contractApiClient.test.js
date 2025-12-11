/**
 * Unit Tests for Contract API Client (Phase 5)
 * 
 * Tests the API client module for REST communication.
 */

import { ContractApiClient, ApiError } from '../../js/contracts/contractApiClient.js';

describe('Contract API Client (contractApiClient.js)', () => {
    let apiClient;
    
    beforeEach(() => {
        // Create fresh instance for each test
        apiClient = new ContractApiClient('/api');
        
        // Mock fetch
        global.fetch = jest.fn();
        
        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
        
        // Mock sessionStorage
        global.sessionStorage = {
            store: {},
            getItem: function(key) { return this.store[key] || null; },
            setItem: function(key, value) { this.store[key] = value.toString(); },
            removeItem: function(key) { delete this.store[key]; },
            clear: function() { this.store = {}; }
        };
    });
    
    afterEach(() => {
        jest.resetAllMocks();
    });
    
    describe('Constructor', () => {
        test('initializes with default base URL', () => {
            const client = new ContractApiClient();
            expect(client.baseUrl).toBe('/api');
        });
        
        test('initializes with custom base URL', () => {
            const client = new ContractApiClient('/custom-api');
            expect(client.baseUrl).toBe('/custom-api');
        });
        
        test('initializes as online by default', () => {
            expect(apiClient.isOnline).toBe(true);
        });
        
        test('initializes with empty offline queue', () => {
            expect(apiClient.offlineQueue).toEqual([]);
        });
    });
    
    describe('setBaseUrl()', () => {
        test('updates base URL', () => {
            apiClient.setBaseUrl('/new-api');
            expect(apiClient.baseUrl).toBe('/new-api');
        });

        test('removes trailing slash', () => {
            apiClient.setBaseUrl('/api/');
            expect(apiClient.baseUrl).toBe('/api');
        });
    });

    describe('request()', () => {
        test('makes GET request correctly', async () => {
            const mockResponse = { data: { contracts: [] } };
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
            
            const result = await apiClient.request('GET', '/contracts');
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    credentials: 'include'
                })
            );
            expect(result).toEqual(mockResponse.data);
        });
        
        test('makes POST request with body', async () => {
            const mockResponse = { data: { id: '123' } };
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
            
            const requestData = { auftrag: 'A123', titel: 'Test' };
            await apiClient.request('POST', '/contracts', requestData);
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(requestData)
                })
            );
        });
        
        test('throws ApiError on non-ok response', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve({
                    message: 'Invalid request',
                    error: 'validation_error'
                })
            });
            
            await expect(apiClient.request('POST', '/contracts', {}))
                .rejects.toThrow(ApiError);
        });

        test('throws descriptive ApiError when server returns HTML (e.g. 404/500)', async () => {
            // Simulate HTML response for 404
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: {
                    get: (name) => name.toLowerCase() === 'content-type' ? 'text/html' : null
                },
                json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON at position 0'))
            });

            // Expect it to throw ApiError with status info, NOT the SyntaxError
            await expect(apiClient.request('GET', '/contracts'))
                .rejects.toThrow('HTTP 404 Not Found');
        });
    });
    
    describe('listContracts()', () => {
        test('fetches contracts with empty filters', async () => {
            const mockContracts = [
                { id: '1', auftrag: 'A001' },
                { id: '2', auftrag: 'A002' }
            ];
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: mockContracts })
            });
            
            const result = await apiClient.listContracts();
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts',
                expect.any(Object)
            );
            expect(result).toEqual(mockContracts);
        });
        
        test('fetches contracts with filters', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: [] })
            });
            
            await apiClient.listContracts({ status: 'offen', search: 'test' });
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts?status=offen&search=test',
                expect.any(Object)
            );
        });
    });
    
    describe('getContract()', () => {
        test('fetches single contract by ID', async () => {
            const mockContract = { id: '123', auftrag: 'A001' };
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: mockContract })
            });
            
            const result = await apiClient.getContract('123');
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts/123',
                expect.any(Object)
            );
            expect(result).toEqual(mockContract);
        });
    });
    
    describe('createContract()', () => {
        test('creates contract with data', async () => {
            const contractData = { auftrag: 'A003', titel: 'New Contract' };
            const mockResponse = { id: '456', ...contractData };
            
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: mockResponse })
            });
            
            const result = await apiClient.createContract(contractData);
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(contractData)
                })
            );
            expect(result.auftrag).toBe('A003');
        });
    });
    
    describe('updateContract()', () => {
        test('updates contract with partial data', async () => {
            const updateData = { status: 'fertig' };
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: { id: '123', status: 'fertig' } })
            });
            
            await apiClient.updateContract('123', updateData);
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts/123',
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                })
            );
        });
    });
    
    describe('deleteContract()', () => {
        test('deletes contract by ID', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: { deleted: true } })
            });
            
            await apiClient.deleteContract('123');
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts/123',
                expect.objectContaining({
                    method: 'DELETE'
                })
            );
        });
    });
    
    describe('bulkUpdateContracts()', () => {
        test('sends bulk update request', async () => {
            const contractIds = ['1', '2', '3'];
            const updates = { status: 'inbearb' };
            
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: { affected: 3 } })
            });
            
            const result = await apiClient.bulkUpdateContracts(contractIds, updates);
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/contracts/bulk-update',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        contract_ids: contractIds,
                        updates
                    })
                })
            );
            expect(result.affected).toBe(3);
        });
    });
    
    describe('Authentication', () => {
        test('login stores user in session storage', async () => {
            const mockUser = { id: 1, username: 'admin', role: 'admin' };
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: { user: mockUser } })
            });
            
            await apiClient.login('admin', 'password');
            
            expect(JSON.parse(sessionStorage.getItem('user'))).toEqual(mockUser);
        });
        
        test('logout clears session storage', async () => {
            sessionStorage.setItem('user', JSON.stringify({ id: 1 }));
            
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: { logged_out: true } })
            });
            
            await apiClient.logout();
            
            expect(sessionStorage.getItem('user')).toBeNull();
        });
        
        test('isAuthenticated returns true when user in storage', () => {
            sessionStorage.setItem('user', JSON.stringify({ id: 1 }));
            expect(apiClient.isAuthenticated()).toBe(true);
        });
        
        test('isAuthenticated returns false when no user', () => {
            sessionStorage.clear();
            expect(apiClient.isAuthenticated()).toBe(false);
        });
        
        test('getCachedUser returns parsed user object', () => {
            const user = { id: 1, username: 'test' };
            sessionStorage.setItem('user', JSON.stringify(user));
            
            expect(apiClient.getCachedUser()).toEqual(user);
        });
    });
    
    describe('Offline Support', () => {
        test('queues requests when offline', async () => {
            apiClient.isOnline = false;
            
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            const result = await apiClient.request('POST', '/contracts', { test: true });
            
            expect(result).toBeNull();
            expect(apiClient.offlineQueue.length).toBe(1);
            expect(apiClient.offlineQueue[0].endpoint).toBe('/contracts');
        });
        
        test('getQueueLength returns queue size', () => {
            apiClient.offlineQueue = [{ method: 'POST' }, { method: 'PUT' }];
            expect(apiClient.getQueueLength()).toBe(2);
        });
        
        test('clearQueue empties the queue', () => {
            apiClient.offlineQueue = [{ method: 'POST' }];
            apiClient.clearQueue();
            expect(apiClient.offlineQueue).toEqual([]);
        });
    });
    
    describe('ApiError', () => {
        test('creates error with message and status', () => {
            const error = new ApiError('Not found', 404, { error: 'not_found' });
            
            expect(error.message).toBe('Not found');
            expect(error.status).toBe(404);
            expect(error.code).toBe('not_found');
            expect(error.name).toBe('ApiError');
        });
        
        test('has default error code when not provided', () => {
            const error = new ApiError('Error', 500, {});
            expect(error.code).toBe('unknown_error');
        });
    });
});

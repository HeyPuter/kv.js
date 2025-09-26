const assert = require('assert');

// Set up fake IndexedDB for testing BEFORE requiring kv.js
require('fake-indexeddb/auto');

// Mock window object for the kv.js IndexedDB detection
global.window = global;

const kvjs = require('../kv.js');

describe('IndexedDB Persistence', () => {
    let instance;

    beforeEach(async () => {
        // Clear any existing databases using FDBFactory reset
        if (typeof indexedDB !== 'undefined') {
            // Reset fake-indexeddb to a clean state
            const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
            global.indexedDB = new FDBFactory();
            global.window.indexedDB = global.indexedDB;
        }
        
        // Create new instance
        instance = new kvjs({ dbName: 'test-kv-store' });
        
        // Wait for IndexedDB initialization
        await instance.waitForInitialization();
    });

    afterEach(async () => {
        // Clean up
        if (instance && instance.db) {
            instance.db.close();
        }
    });

    describe('Initialization', () => {
        it('should initialize IndexedDB when available', async () => {
            assert.strictEqual(instance.isIndexedDBAvailable, true);
            assert.strictEqual(instance.isInitialized, true);
            assert(instance.db !== null);
            assert.strictEqual(instance.dbName, 'test-kv-store');
        });

        it('should create object stores on first initialization', async () => {
            const objectStoreNames = Array.from(instance.db.objectStoreNames);
            assert(objectStoreNames.includes('store'));
            assert(objectStoreNames.includes('expireTimes'));
        });

        it('should use custom database version', async () => {
            const customInstance = new kvjs({ 
                dbName: 'test-custom-version', 
                dbVersion: 2 
            });
            await customInstance.waitForInitialization();
            
            assert.strictEqual(customInstance.dbVersion, 2);
            
            if (customInstance.db) {
                customInstance.db.close();
            }
        });

        it('should NOT initialize IndexedDB when dbName is not explicitly provided', async () => {
            const defaultInstance = new kvjs();
            await defaultInstance.waitForInitialization();
            
            // IndexedDB should not be available when no dbName is explicitly provided
            assert.strictEqual(defaultInstance.isIndexedDBAvailable, false);
            assert.strictEqual(defaultInstance.isInitialized, true);
            assert.strictEqual(defaultInstance.db, null);
            assert.strictEqual(defaultInstance.dbName, undefined); // No default name
        });
    });

    describe('Key-Value Persistence', () => {
        it('should persist simple key-value pairs to IndexedDB', async () => {
            // Set a key-value pair
            instance.set('testKey', 'testValue');
            
            // Give some time for async persistence
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify data is in IndexedDB
            const transaction = instance.db.transaction(['store'], 'readonly');
            const objectStore = transaction.objectStore('store');
            const request = objectStore.get('testKey');
            
            const result = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            assert(result);
            assert.strictEqual(result.key, 'testKey');
            assert.strictEqual(result.value, 'testValue');
        });

        it('should persist different data types', async () => {
            const testData = [
                ['stringKey', 'string value'],
                ['numberKey', 42],
                ['booleanKey', true],
                ['objectKey', { name: 'test', value: 123 }],
                ['arrayKey', [1, 2, 3, 'four']]
            ];

            // Set all test data
            for (const [key, value] of testData) {
                instance.set(key, value);
            }
            
            // Give some time for async persistence
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify all data is persisted correctly
            const transaction = instance.db.transaction(['store'], 'readonly');
            const objectStore = transaction.objectStore('store');
            
            for (const [key, expectedValue] of testData) {
                const request = objectStore.get(key);
                const result = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                
                assert(result);
                assert.strictEqual(result.key, key);
                assert.deepStrictEqual(result.value, expectedValue);
            }
        });

        it('should update existing keys in IndexedDB', async () => {
            // Set initial value
            instance.set('updateKey', 'initial');
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Update the value
            instance.set('updateKey', 'updated');
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify updated value in IndexedDB
            const transaction = instance.db.transaction(['store'], 'readonly');
            const objectStore = transaction.objectStore('store');
            const request = objectStore.get('updateKey');
            
            const result = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            assert(result);
            assert.strictEqual(result.value, 'updated');
        });
    });

    describe('Data Loading', () => {
        it('should load existing data from IndexedDB on initialization', async () => {
            // First, populate IndexedDB directly
            const transaction1 = instance.db.transaction(['store'], 'readwrite');
            const objectStore1 = transaction1.objectStore('store');
            
            const testData = [
                { key: 'loadKey1', value: 'loadValue1' },
                { key: 'loadKey2', value: 'loadValue2' },
                { key: 'loadKey3', value: { nested: 'object' } }
            ];
            
            await Promise.all(testData.map(item => {
                return new Promise((resolve, reject) => {
                    const request = objectStore1.put(item);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }));
            
            // Create a new instance to test loading
            const newInstance = new kvjs({ dbName: 'test-kv-store' });
            await newInstance.waitForInitialization();
            
            // Verify data was loaded into memory
            assert.strictEqual(newInstance.get('loadKey1'), 'loadValue1');
            assert.strictEqual(newInstance.get('loadKey2'), 'loadValue2');
            assert.deepStrictEqual(newInstance.get('loadKey3'), { nested: 'object' });
            
            if (newInstance.db) {
                newInstance.db.close();
            }
        });

        it('should handle empty IndexedDB gracefully', async () => {
            // Create a new instance with empty database
            const emptyInstance = new kvjs({ dbName: 'empty-test-store' });
            await emptyInstance.waitForInitialization();
            
            // Should initialize without errors
            assert.strictEqual(emptyInstance.isInitialized, true);
            assert.strictEqual(emptyInstance.isIndexedDBAvailable, true);
            
            if (emptyInstance.db) {
                emptyInstance.db.close();
            }
        });
    });

    describe('Expiration Persistence', () => {
        it('should persist expiration times to IndexedDB', async () => {
            // Set a key with expiration
            const expireTime = Date.now() + 60000; // 60 seconds from now
            instance.set('expireKey', 'expireValue', { PXAT: expireTime });
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify expiration is persisted
            const transaction = instance.db.transaction(['expireTimes'], 'readonly');
            const objectStore = transaction.objectStore('expireTimes');
            const request = objectStore.get('expireKey');
            
            const result = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            assert(result);
            assert.strictEqual(result.key, 'expireKey');
            assert.strictEqual(result.expireTime, expireTime);
        });

        it('should load and respect expiration times from IndexedDB', async () => {
            // Directly insert expired data into IndexedDB
            const pastTime = Date.now() - 1000; // 1 second ago
            
            const storeTransaction = instance.db.transaction(['store'], 'readwrite');
            const storeObjectStore = storeTransaction.objectStore('store');
            await new Promise((resolve, reject) => {
                const request = storeObjectStore.put({ key: 'expiredKey', value: 'expiredValue' });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            const expireTransaction = instance.db.transaction(['expireTimes'], 'readwrite');
            const expireObjectStore = expireTransaction.objectStore('expireTimes');
            await new Promise((resolve, reject) => {
                const request = expireObjectStore.put({ key: 'expiredKey', expireTime: pastTime });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            // Create new instance to test loading and cleanup
            const newInstance = new kvjs({ dbName: 'test-kv-store' });
            await newInstance.waitForInitialization();
            
            // Expired key should not be available in memory
            assert.strictEqual(newInstance.get('expiredKey'), undefined);
            
            if (newInstance.db) {
                newInstance.db.close();
            }
        });

        it('should remove expiration from IndexedDB when key is persisted', async () => {
            // Set a key with expiration, then persist it
            instance.set('persistKey', 'persistValue', { EX: 60 });
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Remove expiration
            instance.persist('persistKey');
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify expiration is removed from IndexedDB
            const transaction = instance.db.transaction(['expireTimes'], 'readonly');
            const objectStore = transaction.objectStore('expireTimes');
            const request = objectStore.get('persistKey');
            
            const result = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            assert.strictEqual(result, undefined);
        });
    });

    describe('Key Deletion', () => {
        it('should remove keys from IndexedDB when deleted', async () => {
            // Set a key first
            instance.set('deleteKey', 'deleteValue');
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Delete the key
            instance.del('deleteKey');
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify key is removed from IndexedDB
            const transaction = instance.db.transaction(['store'], 'readonly');
            const objectStore = transaction.objectStore('store');
            const request = objectStore.get('deleteKey');
            
            const result = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            assert.strictEqual(result, undefined);
        });

        it('should remove expiration times when key is deleted', async () => {
            // Set a key with expiration
            instance.set('deleteExpireKey', 'value', { EX: 60 });
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Delete the key
            instance.del('deleteExpireKey');
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify both key and expiration are removed
            const storeTransaction = instance.db.transaction(['store'], 'readonly');
            const storeObjectStore = storeTransaction.objectStore('store');
            const storeRequest = storeObjectStore.get('deleteExpireKey');
            
            const storeResult = await new Promise((resolve, reject) => {
                storeRequest.onsuccess = () => resolve(storeRequest.result);
                storeRequest.onerror = () => reject(storeRequest.error);
            });
            
            const expireTransaction = instance.db.transaction(['expireTimes'], 'readonly');
            const expireObjectStore = expireTransaction.objectStore('expireTimes');
            const expireRequest = expireObjectStore.get('deleteExpireKey');
            
            const expireResult = await new Promise((resolve, reject) => {
                expireRequest.onsuccess = () => resolve(expireRequest.result);
                expireRequest.onerror = () => reject(expireRequest.error);
            });
            
            assert.strictEqual(storeResult, undefined);
            assert.strictEqual(expireResult, undefined);
        });

        it('should clear all data from IndexedDB on flushall', async () => {
            // Set multiple keys
            instance.set('key1', 'value1');
            instance.set('key2', 'value2', { EX: 60 });
            instance.set('key3', 'value3');
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Flush all data
            instance.flushall();
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify all data is cleared from IndexedDB
            const storeTransaction = instance.db.transaction(['store'], 'readonly');
            const storeObjectStore = storeTransaction.objectStore('store');
            const storeRequest = storeObjectStore.getAll();
            
            const storeResults = await new Promise((resolve, reject) => {
                storeRequest.onsuccess = () => resolve(storeRequest.result);
                storeRequest.onerror = () => reject(storeRequest.error);
            });
            
            const expireTransaction = instance.db.transaction(['expireTimes'], 'readonly');
            const expireObjectStore = expireTransaction.objectStore('expireTimes');
            const expireRequest = expireObjectStore.getAll();
            
            const expireResults = await new Promise((resolve, reject) => {
                expireRequest.onsuccess = () => resolve(expireRequest.result);
                expireRequest.onerror = () => reject(expireRequest.error);
            });
            
            assert.strictEqual(storeResults.length, 0);
            assert.strictEqual(expireResults.length, 0);
        });
    });

    describe('Error Handling', () => {
        it('should handle IndexedDB errors gracefully', async () => {
            // Close the database to simulate an error
            instance.db.close();
            instance.db = null;
            
            // Operations should not throw errors
            assert.doesNotThrow(() => {
                instance.set('errorKey', 'errorValue');
            });
            
            // The key should still exist in memory
            assert.strictEqual(instance.get('errorKey'), 'errorValue');
        });

        it('should continue working when IndexedDB is not available', async () => {
            // Create instance without IndexedDB
            const originalIndexedDB = global.indexedDB;
            delete global.indexedDB;
            
            const noIDBInstance = new kvjs();
            await noIDBInstance.waitForInitialization();
            
            // Should work normally in memory-only mode
            assert.strictEqual(noIDBInstance.isIndexedDBAvailable, false);
            assert.strictEqual(noIDBInstance.isInitialized, true);
            
            noIDBInstance.set('memoryKey', 'memoryValue');
            assert.strictEqual(noIDBInstance.get('memoryKey'), 'memoryValue');
            
            // Restore global
            global.indexedDB = originalIndexedDB;
        });
    });

    describe('Integration Tests', () => {
        it('should maintain data consistency between memory and IndexedDB', async () => {
            // Perform various operations
            instance.set('key1', 'value1');
            instance.set('key2', 'value2', { EX: 60 });
            instance.set('key3', 'value3');
            instance.del('key3');
            instance.set('key4', 'value4');
            
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Create new instance and verify consistency
            const newInstance = new kvjs({ dbName: 'test-kv-store' });
            await newInstance.waitForInitialization();
            
            assert.strictEqual(newInstance.get('key1'), 'value1');
            assert.strictEqual(newInstance.get('key2'), 'value2');
            assert.strictEqual(newInstance.get('key3'), undefined);
            assert.strictEqual(newInstance.get('key4'), 'value4');
            
            if (newInstance.db) {
                newInstance.db.close();
            }
        });

        it('should handle complex data types and operations', async () => {
            const complexData = {
                user: {
                    id: 123,
                    name: 'John Doe',
                    preferences: {
                        theme: 'dark',
                        notifications: true
                    },
                    tags: ['admin', 'developer']
                }
            };
            
            instance.set('userData', complexData);
            instance.set('counter', 0);
            instance.incr('counter');
            instance.incr('counter');
            
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Create new instance and verify
            const newInstance = new kvjs({ dbName: 'test-kv-store' });
            await newInstance.waitForInitialization();
            
            assert.deepStrictEqual(newInstance.get('userData'), complexData);
            // Counter might be stored as string in memory but number in IndexedDB
            const counterValue = newInstance.get('counter');
            assert.strictEqual(Number(counterValue), 2);
            
            if (newInstance.db) {
                newInstance.db.close();
            }
        });
    });
});
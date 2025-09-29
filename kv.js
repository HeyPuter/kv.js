'use strict';

const XMap = require('./XMap.js');

/**
 * Simple pattern matching function to replace minimatch
 * Supports *, ?, [abc], [a-c], {txt,log} patterns with case-insensitive matching
 * @param {string} str - The string to test
 * @param {string} pattern - The glob pattern
 * @returns {boolean} - Whether the string matches the pattern
 */
function simpleMatch(str, pattern) {
    // Convert to lowercase for case-insensitive matching
    const lowerStr = str.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    
    // Handle empty pattern
    if (lowerPattern === '') return false;
    
    // Handle exact match
    if (lowerPattern.indexOf('*') === -1 && lowerPattern.indexOf('?') === -1 && 
        lowerPattern.indexOf('[') === -1 && lowerPattern.indexOf('{') === -1) {
        return lowerStr === lowerPattern;
    }
    
    // Handle brace expansion {txt,log} -> (txt|log)
    let expandedPattern = lowerPattern;
    const braceMatch = expandedPattern.match(/\{([^}]+)\}/);
    if (braceMatch) {
        const options = braceMatch[1].split(',');
        const alternatives = options.map(opt => expandedPattern.replace(braceMatch[0], opt.trim()));
        return alternatives.some(alt => simpleMatch(str, alt));
    }
    
    // Convert glob pattern to regex
    let regexPattern = '';
    let i = 0;
    
    while (i < expandedPattern.length) {
        const char = expandedPattern[i];
        
        if (char === '*') {
            regexPattern += '.*';
        } else if (char === '?') {
            regexPattern += '.';
        } else if (char === '[') {
            // Handle character class [abc] or [a-c]
            let j = i + 1;
            let charClass = '[';
            
            while (j < expandedPattern.length && expandedPattern[j] !== ']') {
                charClass += expandedPattern[j];
                j++;
            }
            
            if (j < expandedPattern.length) {
                charClass += ']';
                regexPattern += charClass;
                i = j;
            } else {
                // Malformed character class, treat [ as literal
                regexPattern += '\\[';
            }
        } else {
            // Escape special regex characters
            if (/[.+^${}()|\\]/.test(char)) {
                regexPattern += '\\' + char;
            } else {
                regexPattern += char;
            }
        }
        i++;
    }
    
    try {
        const regex = new RegExp('^' + regexPattern + '$', 'i');
        return regex.test(str);
    } catch (e) {
        // If regex is invalid, fall back to exact match
        return lowerStr === lowerPattern;
    }
}

// The cleanup loop runs as long as there's at least one key set, and will
// regularly check for expired keys and remove them from the store.
const CLEANUP_INTERVAL = 20;

class kvjs {
    constructor(options = {}) {
        // Handle different parameter formats for backward compatibility
        if (typeof options === 'string') {
            options = { dbName: options };
        }
        
        // Initialize the store and expireTimes maps
        this.store = new XMap();
        this.expireTimes = new XMap();
        
        // IndexedDB properties
        this.db = null;
        this.dbName = options.dbName;
        this.dbVersion = options.dbVersion || 1;
        this.isIndexedDBAvailable = false;
        this.isInitialized = false;
        this.initPromise = null;

        // wrap the set function to trigger the cleanup interval on each set
        this.storeSet = (key, value) => {
            this.store.set(key, value);
            this._initCleanupLoop(CLEANUP_INTERVAL);
            // Persist to IndexedDB if available
            if (this.isIndexedDBAvailable && this.db) {
                this._persistToIndexedDB(key, value);
            }
        }

        // Initialize IndexedDB if available
        this._initIndexedDB();
    }

    /**
     * Initialize IndexedDB if available in the browser environment
     * @private
     */
    _initIndexedDB() {
        // Check if we're in a browser environment, IndexedDB is available, and dbName was explicitly provided
        if (typeof window !== 'undefined' && window.indexedDB && this.dbName) {
            this.isIndexedDBAvailable = true;
            this.initPromise = this._setupIndexedDB();
        } else {
            this.isInitialized = true;
        }
    }

    /**
     * Set up IndexedDB database and load existing data
     * @private
     * @returns {Promise<void>}
     */
    async _setupIndexedDB() {
        try {
            this.db = await this._openDatabase();
            await this._loadFromIndexedDB();
            this.isInitialized = true;
        } catch (error) {
            console.warn('Failed to initialize IndexedDB:', error);
            this.isIndexedDBAvailable = false;
            this.isInitialized = true;
        }
    }

    /**
     * Open IndexedDB database
     * @private
     * @returns {Promise<IDBDatabase>}
     */
    _openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('store')) {
                    db.createObjectStore('store', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('expireTimes')) {
                    db.createObjectStore('expireTimes', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Load existing data from IndexedDB into memory
     * @private
     * @returns {Promise<void>}
     */
    async _loadFromIndexedDB() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['store', 'expireTimes'], 'readonly');
            const storeObjectStore = transaction.objectStore('store');
            const expireTimesObjectStore = transaction.objectStore('expireTimes');

            // Load store data
            const storeRequest = storeObjectStore.getAll();
            const expireTimesRequest = expireTimesObjectStore.getAll();

            const [storeData, expireTimesData] = await Promise.all([
                new Promise((resolve, reject) => {
                    storeRequest.onsuccess = () => resolve(storeRequest.result);
                    storeRequest.onerror = () => reject(storeRequest.error);
                }),
                new Promise((resolve, reject) => {
                    expireTimesRequest.onsuccess = () => resolve(expireTimesRequest.result);
                    expireTimesRequest.onerror = () => reject(expireTimesRequest.error);
                })
            ]);

            // Populate in-memory stores
            storeData.forEach(item => {
                this.store.set(item.key, item.value);
            });

            expireTimesData.forEach(item => {
                this.expireTimes.set(item.key, item.expireTime);
            });

            // Clean up any expired keys that were loaded
            const currentTime = Date.now();
            for (const [key, expireTime] of this.expireTimes.entries()) {
                if (currentTime > expireTime) {
                    this.store.delete(key);
                    this.expireTimes.delete(key);
                    // Also remove from IndexedDB
                    this._removeFromIndexedDB(key);
                }
            }

        } catch (error) {
            console.warn('Failed to load data from IndexedDB:', error);
        }
    }

    /**
     * Persist a key-value pair to IndexedDB
     * @private
     * @param {*} key - The key to persist
     * @param {*} value - The value to persist
     */
    async _persistToIndexedDB(key, value) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['store'], 'readwrite');
            const objectStore = transaction.objectStore('store');
            objectStore.put({ key, value });
        } catch (error) {
            console.warn('Failed to persist to IndexedDB:', error);
        }
    }

    /**
     * Persist expiration time to IndexedDB
     * @private
     * @param {*} key - The key
     * @param {number} expireTime - The expiration timestamp
     */
    async _persistExpirationToIndexedDB(key, expireTime) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['expireTimes'], 'readwrite');
            const objectStore = transaction.objectStore('expireTimes');
            if (expireTime !== undefined) {
                objectStore.put({ key, expireTime });
            } else {
                objectStore.delete(key);
            }
        } catch (error) {
            console.warn('Failed to persist expiration to IndexedDB:', error);
        }
    }

    /**
     * Remove a key from IndexedDB
     * @private
     * @param {*} key - The key to remove
     */
    async _removeFromIndexedDB(key) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['store', 'expireTimes'], 'readwrite');
            const storeObjectStore = transaction.objectStore('store');
            const expireTimesObjectStore = transaction.objectStore('expireTimes');
            
            storeObjectStore.delete(key);
            expireTimesObjectStore.delete(key);
        } catch (error) {
            console.warn('Failed to remove from IndexedDB:', error);
        }
    }

    /**
     * Wait for IndexedDB initialization to complete
     * @returns {Promise<void>}
     */
    async waitForInitialization() {
        if (this.isInitialized) return;
        if (this.initPromise) {
            await this.initPromise;
        }
    }

    /**
     * Set the string value of a key with optional NX/XX/GET/EX/PX/EXAT/PXAT/KEEPTTL, GET, and expiration options.
     * @param {*} key - The key to set.
     * @param {*} value - The value to set.
     * @param {Object} [options] - An object with optional arguments.
     *                              NX (boolean): Set the key only if it does not exist.
     *                              XX (boolean): Set the key only if it already exists.
     *                              GET (boolean): Return the old value of the key before setting the new value.
     *                              EX (number|undefined): Set the key with an expiration time (in seconds).
     *                              PX (number|undefined): Set the key with an expiration time (in milliseconds).
     *                              EXAT (number|undefined): Set the key with an exact UNIX timestamp (in seconds) for expiration.
     *                              PXAT (number|undefined): Set the key with an exact UNIX timestamp (in milliseconds) for expiration.
     *                              KEEPTTL (boolean): Retain the key's existing TTL when setting a new value.
     * @returns {boolean|undefined} - true if the operation was successful, or the existing value if the GET option is specified and the key already exists.
     */
    set(key, value, options = {}) {
        const {
            NX = false,
            XX = false,
            GET = false,
            EX = undefined,
            PX = undefined,
            EXAT = undefined,
            PXAT = undefined,
            KEEPTTL = false,
        } = options;

        const nx = NX;
        const xx = XX;
        const get = GET;
        let ex = EX ? parseInt(EX, 10) : undefined;
        let px = PX ? parseInt(PX, 10) : undefined;
        let exat = EXAT ? parseInt(EXAT, 10) : undefined;
        let pxat = PXAT ? parseInt(PXAT, 10) : undefined;
        const keepttl = KEEPTTL;

        // Check if the key already exists
        const exists = this.store.has(key);
        if (xx && !exists) {
            return undefined;
        }
        if (nx && exists) {
            return undefined;
        }

        // Get the existing value if the GET option is specified
        let oldValue;
        if (get && exists) {
            oldValue = this.store.get(key);
        }

        // Set the new value
        this.storeSet(key, value);

        // Handle expiration options
        if (ex !== undefined || px !== undefined || exat !== undefined || pxat !== undefined || keepttl) {
            let expireTime = undefined;
            if (ex !== undefined) {
                expireTime = Date.now() + ex * 1000;
            } else if (px !== undefined) {
                expireTime = Date.now() + px;
            } else if (exat !== undefined) {
                expireTime = exat * 1000;
            } else if (pxat !== undefined) {
                expireTime = pxat;
            } else if (keepttl && exists) {
                expireTime = this.expireTimes.get(key);
            }
            if (expireTime !== undefined) {
                this.expireTimes.set(key, expireTime);
                // Persist expiration to IndexedDB if available
                if (this.isIndexedDBAvailable && this.db) {
                    this._persistExpirationToIndexedDB(key, expireTime);
                }
            }
        } else {
            this.expireTimes.delete(key);
            // Remove expiration from IndexedDB if available
            if (this.isIndexedDBAvailable && this.db) {
                this._persistExpirationToIndexedDB(key, undefined);
            }
        }

        return get ? oldValue : true;
    }
    
    /**
     * Get the value of a key.
     * @param {*} key - The key to get.
     * @returns {*} - The value of the key, or `undefined` if the key does not exist or has expired.
     */
    get(key) {
        const isExpired = this._checkAndRemoveExpiredKey(key);
        if (isExpired)
            return undefined;

        return this.store.get(key);
    }

    /**
     * Delete specified key(s). If a key does not exist, it is ignored.
     * @param {*} key - The key to delete.
     * @returns {number} - 1 if the key was deleted, 0 if the key did not exist or has expired.
     */
    del(...keys) {
        let numDeleted = 0;

        for (const key of keys) {
            // Check if the key has expired and remove it if it has.
            const isExpired = this._checkAndRemoveExpiredKey(key);
            if (isExpired) {
                continue;
            }

            // Delete the key from the Map and delete any existing expiration time.
            if (this.store.delete(key)) {
                this.expireTimes.delete(key);
                // Remove from IndexedDB if available
                if (this.isIndexedDBAvailable && this.db) {
                    this._removeFromIndexedDB(key);
                }
                numDeleted++;
            }
        }

        // Return the number of keys that were deleted.
        return numDeleted;
    }

    /**
     * Check if one or more keys exist.
     * @param {...string} keys - The keys to check.
     * @returns {number} - The number of keys that exist.
     */
    exists(...keys) {
        let numExists = 0;

        for (const key of keys) {
            // Check if the key has expired and remove it if it has.
            const isExpired = this._checkAndRemoveExpiredKey(key);
            if (isExpired) {
                continue;
            }

            // Increment the number of existing keys if the key exists in the Map.
            if (this.store.has(key)) {
                numExists++;
            }
        }

        // Return the number of keys that exist.
        return numExists;
    }

    /**
     * Increment the value of a key by 1.
     * @param {*} key - The key to increment.
     * @returns {number} - The new value of the key.
     */
    incr(key) {
        return this.incrby(key, 1);
    }

    /**
     * Increment the value of a key by a given amount.
     * @param {*} key - The key to increment.
     * @param {number} increment - The amount to increment the key by.
     * @returns {number} - The new value of the key.
     * @throws {Error} - If the value of the key is not an integer.
     */
    incrby(key, increment) {
        let value = this.store.get(key);
        if (value === undefined) {
            value = 0;
        } else if (!Number.isInteger(Number(value))) {
            throw new Error('ERR value is not an integer');
        }

        const newValue = Number(value) + increment;
        this.storeSet(key, newValue.toString());
        return newValue;
    }

    /**
     * Decrement the value of a key by 1.
     * @param {*} key - The key to decrement.
     * @returns {number} - The new value of the key.
     * @throws {Error} - If the value is not an integer.
     */
    decr(key) {
        try {
            return this.decrby(key, 1);
        } catch (err) {
            throw err;
        }
    }

    /**
     * Decrement the value of a key by a given amount.
     * @param {*} key - The key to decrement.
     * @param {number} decrement - The amount to decrement the key by.
     * @returns {number} - The new value of the key.
     * @throws {Error} - If the value is not an integer.
     */
    decrby(key, decrement) {
        let value = this.store.get(key);
        if (value === undefined) {
            value = 0;
        } else if (!Number.isInteger(Number(value))) {
            throw new Error('ERR value is not an integer');
        }

        const newValue = Number(value) - decrement;
        this.storeSet(key, newValue.toString());
        return newValue;
    }

    /**
     * Set a key's time to live in seconds.
     * @param {*} key - The key to set the expiry time for.
     * @param {number} seconds - The number of seconds until the key should expire.
     * @param {Object} options - (Optional) An object containing the option for the expiry behavior.
     *                          Can be { NX: true } (set expire only if key has no expiry time),
     *                          { XX: true } (set expire only if key has an expiry time),
     *                          { GT: true } (set expire only if key's expiry time is greater than the specified time),
     *                          or { LT: true } (set expire only if key's expiry time is less than the specified time).
     * @returns {number} - 1 if the key's expiry time was set, 0 otherwise.
     */
    expire(key, seconds, options = {}) {
        if (!this.store.has(key)) {
            return 0;
        }

        const { NX = false, XX = false, GT = false, LT = false } = options;

        const now = Date.now();
        const expireTime = this.expireTimes.get(key);

        if (NX && expireTime !== undefined) {
            return 0;
        } else if (XX && expireTime === undefined) {
            return 0;
        } else if (GT && (expireTime === undefined || expireTime <= now + seconds * 1000)) {
            return 0;
        } else if (LT && (expireTime === undefined || expireTime >= now + seconds * 1000)) {
            return 0;
        }

        this.expireTimes.set(key, now + seconds * 1000);
        return 1;
    }

    /**
     * Find all keys matching the specified pattern.
     * @param {string} pattern - The pattern to match keys against. Supports glob-style patterns.
     * @returns {Array} - An array of keys that match the specified pattern.
     */
    keys(pattern) {
        const keys = [];
    
        for (const [key, value] of this.store.entries()) {
            if (simpleMatch(key, pattern)) {
                const expireTime = this.expireTimes.get(key);
                if (expireTime === undefined || expireTime > Date.now()) {
                    keys.push(key);
                }
            }
        }
    
        return keys;
    }
    
    /**
     * Returns an array of values stored at the given keys. If a key is not found, undefined is returned for that key.
     * @param {...string} keys - The keys to retrieve.
     * @returns {Array} - An array of values.
     */
    mget(...keys) {
        return keys.map(key => this.get(key));
    }

    /**
     * Set multiple keys to their respective values.
     * @param  {...any} keyValuePairs - The keys and values to set, given as alternating arguments.
     * @returns {boolean} - A boolean indicating that the operation was successful.
     * @throws {Error} - If the number of arguments is odd.
     */
    mset(...keyValuePairs) {
        if (keyValuePairs.length % 2 !== 0) {
            throw new Error('MSET requires an even number of arguments');
        }

        for (let i = 0; i < keyValuePairs.length; i += 2) {
            this.set(keyValuePairs[i], keyValuePairs[i + 1]);
        }

        return true;
    }

    /**
     * Renames a key to a new key only if the new key does not exist.
     * @param {string} oldKey - The old key name.
     * @param {string} newKey - The new key name.
     * @returns {number} - 1 if the key was successfully renamed, 0 otherwise.
     */
    renamenx(oldKey, newKey) {
        if (!this.store.has(oldKey) || this.store.has(newKey)) {
            return 0;
        }
        const value = this.store.get(oldKey);
        this.store.delete(oldKey);
        this.storeSet(newKey, value);

        // Update expiration times if necessary
        if (this.expireTimes.has(oldKey)) {
            const expireTime = this.expireTimes.get(oldKey);
            this.expireTimes.delete(oldKey);
            this.expireTimes.set(newKey, expireTime);
        }

        return 1;
    }


    /**
     * Return a random key from the cache.
     * @returns {(string|undefined)} - A random key from the cache or undefined if the cache is empty.
     */
    randomkey() {
        const keys = Array.from(this.store.keys());
        if (keys.length === 0)
            return undefined;

        const randomIndex = Math.floor(Math.random() * keys.length);
        return keys[randomIndex];
    }

    /**
     * Set a key's time-to-live in seconds.
     * @param {*} key - The key to set the TTL for.
     * @param {number} timestampSeconds - The UNIX timestamp (in seconds) at which the key should expire.
     * @param {Object} [options] - An object with optional arguments specifying when the expiration should be set:
     *                            - { NX: true } if the key does not have an expiration time
     *                            - { XX: true } if the key already has an expiration time
     *                            - { GT: true } if the expiration should only be set if it is greater than the current TTL
     *                            - { LT: true } if the expiration should only be set if it is less than the current TTL
     * @returns {number} - 1 if the TTL was set, 0 if the key does not exist or the TTL was not set.
     * @throws {Error} - Throws an error if the timestampSeconds parameter is not a valid number.
     */
    expireat(key, timestampSeconds, options = {}) {
        if (typeof timestampSeconds !== 'number' || isNaN(timestampSeconds)) {
            throw new Error('ERR invalid expire time in SETEX');
        }
    
        // If the key does not exist, return 0
        if (!this.store.has(key)) {
            return 0;
        }
    
        const { NX = false, XX = false, GT = false, LT = false } = options;
    
        const now = Date.now();
        const ttlMillis = (timestampSeconds * 1000) - now;
    
        if (ttlMillis <= 0) {
            this.store.delete(key);
            this.expireTimes.delete(key);
            return 0;
        }
    
        const existingTtl = this.pttl(key);
        
        if (XX && existingTtl === -1) {
            // Do nothing, key does not exist or has no TTL
            return 0;
        } else if (NX && existingTtl !== -1) {
            // Do nothing, key exists and has a TTL set
            return 0;
        } else if (GT && (existingTtl !== -1 && ttlMillis <= existingTtl)) {
            // Do nothing, key exists and new TTL is less than or equal to existing TTL
            return 0;
        } else if (LT && (existingTtl !== -1 && ttlMillis >= existingTtl)) {
            // Do nothing, key exists and new TTL is greater than or equal to existing TTL
            return 0;
        }
    
        return this.pexpire(key, ttlMillis);
    }    


    /**
     * Set a timeout for the key, in milliseconds.
     * @param {*} key - The key to set the expiration for.
     * @param {number} ttlMillis - The time-to-live for the key, in milliseconds.
     * @param {Object} [options] - An object with optional arguments specifying when the expiration should be set:
     *                            - { NX: true } if the key does not have an expiration time
     *                            - { XX: true } if the key already has an expiration time
     *                            - { GT: true } if the expiration should only be set if it is greater than the current TTL
     *                            - { LT: true } if the expiration should only be set if it is less than the current TTL
     * @returns {number} - 1 if the timeout was set, 0 otherwise.
     */
    pexpire(key, ttlMillis, options = {}) {
        const { NX = false, XX = false, GT = false, LT = false } = options;

        if (NX && this.store.has(key) || XX && !this.store.has(key)) {
            return 0;
        }

        if (GT || LT) {
            const existingTTL = this.pttl(key);
            if (GT && existingTTL >= ttlMillis || LT && existingTTL <= ttlMillis) {
                return 0;
            }
        }

        this.expireTimes.set(key, Date.now() + ttlMillis);
        return 1;
    }


    /**
     * Sets the expiration timestamp for the key in milliseconds.
     * @param {*} key - The key to set the expiration timestamp for.
     * @param {number} timestampMillis - The expiration timestamp in milliseconds.
     * @returns {number} - 1 if the timeout was set, 0 if the key does not exist or the timeout could not be set.
     */
    pexpireat(key, timestampMillis) {
        const ttlMillis = timestampMillis - Date.now();
        if (ttlMillis <= 0) {
            this.store.delete(key);
            this.expireTimes.delete(key);
            return 0;
        }
        return this.pexpire(key, ttlMillis);
    }

    /**
     * Returns the remaining time to live of a key that has an expiration set, in milliseconds. 
     * If the key does not exist or does not have an associated expiration time, it returns -2 or -1, respectively.
     * 
     * @param {*} key - The key to check.
     * @returns {number} - The remaining time to live in milliseconds. If the key does not exist or has no expiration, returns -2 or -1 respectively.
     */
    pttl(key) {
        if (!this.store.has(key)) {
            return -2;
        }
        if (!this.expireTimes.has(key)) {
            return -1;
        }
        const ttl = this.expireTimes.get(key) - Date.now();
        return ttl > 0 ? ttl : -2;
    }

    /**
     * Returns the time-to-live of a key in seconds. If the key does not exist or does not have an
     * associated expiration time, it returns -2 or -1, respectively. If the key exists and has an
     * associated expiration time, it returns the number of seconds left until expiration. The returned
     * value can be negative if the key has already expired.
     *
     * @param {*} key - The key to check the time-to-live for.
     * @returns {number} - The time-to-live of the key in seconds, or -2 if the key does not exist,
     * -1 if the key exists but does not have an associated expiration time, or a negative value if
     * the key has already expired.
     */
    ttl(key) {
        if (!this.store.has(key)) {
            return -2;
        }
        if (!this.expireTimes.has(key)) {
            return -1;
        }
        const ttl = Math.floor((this.expireTimes.get(key) - Date.now()) / 1000);
        return ttl > 0 ? ttl : -2;
    }

    /**
     * Remove the expiration from a key.
     * @param {*} key - The key to remove expiration from.
     * @returns {number} - 1 if the expiration was removed, 0 otherwise.
     */
    persist(key) {
        if (!this.store.has(key) || !this.expireTimes.has(key)) {
            return 0;
        }
        this.expireTimes.delete(key);
        // Remove expiration from IndexedDB if available
        if (this.isIndexedDBAvailable && this.db) {
            this._persistExpirationToIndexedDB(key, undefined);
        }
        return 1;
    }

    /**
     * Get a substring of the string stored at a key.
     * @param {*} key - The key to get the substring from.
     * @param {number} start - The starting index of the substring (0-based).
     * @param {number} end - The ending index of the substring (0-based, inclusive).
     * @returns {string} - The substring, or an empty string if the key does not exist or is not a string.
     */
    getrange(key, start, end) {
        const value = this.get(key);
        if (typeof value !== 'string')
            return '';

        return value.slice(start, end + 1);
    }

    /**
     * Replaces the current value of a key with the specified new value and returns the old value.
     * If the key does not exist, it is created and set to the specified value.
     * @param {*} key - The key to update.
     * @param {*} value - The new value to set.
     * @returns {string|undefined} - The old value of the key, or undefined if the key did not exist.
     */
    getset(key, value) {
        const oldValue = this.get(key);
        this.set(key, value);
        return oldValue;
    }

    /**
     * Set the value of a key with an expiration time in milliseconds.
     * If the key already exists, it will be overwritten with the new value.
     * @param {*} key - The key to set.
     * @param {*} value - The value to set for the key.
     * @param {number} ttl - The time-to-live for the key, in milliseconds.
     * @returns {boolean|undefined} - true if the key was set successfully.
     */
    setex(key, value, ttl) {
        if (!this.store.has(key))
            return undefined;

        this.set(key, value);
        this.expire(key, ttl);
        return true;
    }

    /**
     * Sets the substring of the string value stored at the specified key starting at the specified offset
     * with the given value. If the offset is out of range, will return an error.
     * If the key does not exist, a new key holding a zero-length string will be created.
     * The length of the string will be increased as necessary to accommodate the new value.
     * @param {*} key - The key of the string value to set the range of.
     * @param {number} offset - The zero-based index at which to start replacing characters.
     * @param {*} value - The new value to insert into the string.
     * @returns {number} - The length of the string after it has been modified.
     * @throws {Error} - If the offset is out of range or an error occurs while executing the command.
     */
    setrange(key, offset, value) {
        if (typeof offset !== 'number' || offset < 0) {
            throw new Error('Invalid offset value');
        }
    
        if (typeof value !== 'string') {
            throw new Error('Value must be a string');
        }
    
        let currentValue = this.get(key);
        if (currentValue === undefined || currentValue === undefined) {
            currentValue = '';
        }
    
        const left = currentValue.slice(0, offset);
        const right = currentValue.slice(offset + value.length);
        const newValue = left + value + right;
        this.set(key, newValue);
        return newValue.length;
    }

    /**
     * Get the length of the value stored at a key.
     * @param {*} key - The key to get the length of.
     * @returns {number} - The length of the value stored at the key, or 0 if the key does not exist.
     */
    strlen(key) {
        const value = this.get(key);
        return value === undefined ? 0 : value.length;
    }

    /**
     * Set the values of multiple keys.
     * @param {*} keyValuePairs - The key-value pairs to set.
     * @param {*} value - The value to set for the key.
     * @returns {number} - 1 if the key was set, 0 if the key was not set.
     * @throws {Error} - If an error occurs while executing the command.
     */
    msetnx(...keyValuePairs) {
        if (keyValuePairs.length % 2 !== 0) {
            throw new Error('MSETNX requires an even number of arguments');
        }

        for (let i = 0; i < keyValuePairs.length; i += 2) {
            if (this.store.has(keyValuePairs[i])) {
                return 0;
            }
        }

        for (let i = 0; i < keyValuePairs.length; i += 2) {
            this.set(keyValuePairs[i], keyValuePairs[i + 1]);
        }

        return 1;
    }

    /**
     * Increment the value of a key by a floating-point number.
     * @param {*} key - The key to increment.
     * @param {number} increment - The value to increment by.
     * @returns {number} - The new value of the key.
     * @throws {Error} - If the value is not a valid float.
     */
    incrbyfloat(key, increment) {
        let value = this.store.get(key);
        if (value === undefined) {
            value = 0;
        } else if (isNaN(parseFloat(value))) {
            throw new Error('ERR value is not a valid float');
        }

        const newValue = parseFloat(value) + increment;
        this.storeSet(key, newValue.toString());
        return newValue;
    }

    /**
     * If the key already exists, the value is appended to the end of the existing value. 
     * If the key doesn't exist, a new key is created and set to the value.
     * @param {*} key - The key to append the value to.
     * @param {*} value - The value to append.
     * @returns {number} - The length of the new string.
     */
    append(key, value) {
        const currentValue = this.get(key);
        const newValue = currentValue === undefined ? value : currentValue + value;
        this.set(key, newValue);
        return newValue.length;
    }

    /**
     * Returns the bit value at a given offset in the string value of a key.
     * @param {*} key - The key to get the bit from.
     * @param {number} offset - The bit offset.
     * @returns {number} - 1 or 0, the bit value at the given offset. If the key does not exist or the offset is out of range, 0 is returned.
     */
    getbit(key, offset) {
        const value = this.get(key);
        if (value === undefined || offset >= value.length * 8) {
            return 0;
        }
        const byteIndex = Math.floor(offset / 8);
        const bitIndex = 7 - (offset % 8);
        const byteValue = value.charCodeAt(byteIndex);
        return (byteValue >> bitIndex) & 1;
    }

    /**
     * Sets or clears the bit at offset in the string value stored at key.
     * @param {*} key - The key to set the bit on.
     * @param {number} offset - The bit offset.
     * @param {number} bit - The bit value to set.
     * @returns {number} - The original bit value stored at offset.
     */
    setbit(key, offset, bit) {
        if (bit !== 0 && bit !== 1) {
            throw new Error('ERR bit is not an integer or out of range');
        }

        let value = this.get(key);
        if (value === undefined) {
            value = '';
        }

        const byteIndex = Math.floor(offset / 8);
        const bitIndex = 7 - (offset % 8);

        while (byteIndex >= value.length) {
            value += '\x00';
        }

        const byteValue = value.charCodeAt(byteIndex);
        const oldValue = (byteValue >> bitIndex) & 1;

        const newValue = byteValue & ~(1 << bitIndex) | (bit << bitIndex);
        const newStrValue = String.fromCharCode(newValue);

        const left = value.slice(0, byteIndex);
        const right = value.slice(byteIndex + 1);
        const updatedValue = left + newStrValue + right;
        this.set(key, updatedValue);

        return oldValue;
    }

    /**
     * Copies the value stored at a key to another key.
     * @param {*} source - The key to copy from.
     * @param {*} destination - The key to copy to.
     * @returns {number} - 1 if the key was copied, 0 if the key was not copied.
     */
    copy(source, destination) {
        const value = this.get(source);
        if (value === undefined) {
            return 0;
        }
        this.set(destination, value);
        return 1;
    }

    /**
     * Renames a key. 
     * @param {*} key - The key to rename.
     * @param {*} newKey - The new key name.
     * @returns {boolean} - true if the key was renamed, an error if the key was not renamed.
     */
    rename(key, newKey) {
        if (!this.store.has(key)) {
            throw new Error('ERR no such key');
        }
        if (key === newKey) {
            return true;
        }
        const value = this.store.get(key);
        const expireTime = this.expireTimes.get(key);
        this.storeSet(newKey, value);
        this.store.delete(key);
        if (expireTime !== undefined) {
            this.expireTimes.set(newKey, expireTime);
            this.expireTimes.delete(key);
        }
        return true;
    }

    /**
     * Returns the type of the value stored at a key.
     * @param {*} key - The key to get the type of.
     * @returns {string} - The type of the value stored at the key.
     */
    type(key) {
        if (!this.store.has(key)) {
            return 'none';
        }
        const value = this.store.get(key);
        return typeof value;
    }

    /**
     * Add members to a set stored at key.
     * @param {*} key - The key to add the members to.
     * @param {*} members - The members to add to the set.
     * @returns {number} - The number of members that were added to the set, not including all the members that were already present in the set.
     */
    sadd(key, ...members) {
        if (!this.store.has(key)) {
            this.storeSet(key, new Set());
        }
        const set = this.store.get(key);
        if (!(set instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        let addedCount = 0;
        for (const member of members) {
            if (!set.has(member)) {
                set.add(member);
                addedCount++;
            }
        }
        return addedCount;
    }

    /**
     * Returns the number of members of the set stored at key.
     * @param {*} key - The key to get the size of.
     * @returns {number} - The number of members in the set.
     */
    scard(key) {
        const value = this.store.get(key);
        if (value === undefined) {
            return 0;
        }
        if (!(value instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        return value.size;
    }

    /**
     * This method retrieves the members of a set that are present in the first set but not in any of the subsequent sets, and returns them as a new set.
     * @param {*} key1 - The first key to compare.
     * @param {*} otherKeys - The other keys to compare.
     * @returns {Array} - An array of members.
     */
    sdiff(key1, ...otherKeys) {
        const set1 = this.store.get(key1) || new Set();
        if (!(set1 instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        const resultSet = new Set(set1);

        for (const key of otherKeys) {
            const otherSet = this.store.get(key) || new Set();
            if (!(otherSet instanceof Set)) {
                throw new Error('ERR Operation against a key holding the wrong kind of value');
            }
            for (const member of otherSet) {
                resultSet.delete(member);
            }
        }

        return Array.from(resultSet);
    }

    /**
     * The functionality of this method is similar to that of sdiff, except that instead of returning the resulting set, it stores the set in the destination provided as an argument.
     * @param {*} destination - The key to store the resulting set in.
     * @param {*} key1 - The first key to compare.
     * @param {*} otherKeys - The other keys to compare.
     * @returns {number} - The number of elements in the resulting set.
     */
    sdiffstore(destination, key1, ...otherKeys) {
        const diff = this.sdiff(key1, ...otherKeys);
        const resultSet = new Set(diff);
        this.storeSet(destination, resultSet);
        return resultSet.size;
    }

    /**
     * This method retrieves the members that are present in all the sets provided as arguments, and returns them as a new set representing the intersection of those sets.
     * @param {*} keys - The keys to intersect.
     * @returns {Array} - An array of members.
     */
    sinter(...keys) {
        if (keys.length === 0) {
            return [];
        }

        const sets = keys.map(key => {
            const set = this.store.get(key);
            if (set === undefined) {
                return new Set();
            }
            if (!(set instanceof Set)) {
                throw new Error('ERR Operation against a key holding the wrong kind of value');
            }
            return set;
        });

        const resultSet = new Set(sets[0]);
        for (let i = 1; i < sets.length; i++) {
            for (const member of resultSet) {
                if (!sets[i].has(member)) {
                    resultSet.delete(member);
                }
            }
        }

        return Array.from(resultSet);
    }

    /**
     * Returns the number of elements in the intersection of one or more sets.
     * @param {...string} keys - The keys of the sets to intersect.
     * @returns {number} - The cardinality (number of elements) in the intersection of the sets.
     */
    sintercard(...keys) {
        return this.sinter(...keys).length;
    }

    /**
     * Computes the intersection of one or more sets and stores the result in a new set.
     * @param {string} destination - The key of the new set to store the result in.
     * @param {...string} keys - The keys of the sets to intersect.
     * @returns {number} - The cardinality (number of elements) in the intersection of the sets.
     */
    sinterstore(destination, ...keys) {
        const intersection = this.sinter(...keys);
        const resultSet = new Set(intersection);
        this.storeSet(destination, resultSet);
        return resultSet.size;
    }

    /**
     * This method determines if a given value is a member of the set stored at key.
     * @param {*} key - The key to check.
     * @param {*} member - The member to check for.
     * @returns {number} - 1 if the member is a member of the set stored at key. 0 if the member is not a member of the set, or if key does not exist.
     */
    sismember(key, member) {
        const set = this.store.get(key);
        if (set === undefined) {
            return false;
        }
        if (!(set instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        return set.has(member) ? true : false;
    }

    /**
     * This method retrieves all the members of the set value stored at key.
     * @param {*} key - The key to get the members of.
     * @returns {Array} - An array of members.
     */
    smembers(key) {
        const set = this.store.get(key);
        if (set === undefined) {
            return [];
        }
        if (!(set instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        return Array.from(set);
    }

    /**
     * Determines whether each member is a member of the set stored at key.
     * @param {*} key - The key to check.
     * @param {*} members - The members to check for.
     * @returns {Array} - An array of 1s and 0s.
     */
    smismember(key, ...members) {
        const set = this.store.get(key) || new Set();
        if (!(set instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        return members.map(member => (set.has(member) ? 1 : 0));
    }

    /**
     * Moves a member from one set to another.
     * @param {*} source - The key of the set to move the member from.
     * @param {*} destination - The key of the set to move the member to.
     * @param {*} member - The member to move.
     * @returns {number} - 1 if the member was moved. 0 if the member was not moved.
     */
    smove(source, destination, member) {
        const srcSet = this.store.get(source);
        if (srcSet === undefined || !srcSet.has(member)) {
            return 0;
        }
        if (!(srcSet instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }

        const destSet = this.store.get(destination) || new Set();
        if (!(destSet instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }

        srcSet.delete(member);
        destSet.add(member);
        this.storeSet(destination, destSet);

        return 1;
    }

    /**
     * Removes and returns one or multiple random members from a set.
     * @param {*} key - The key of the set.
     * @param {number} [count=1] - The number of random members to return.
     * @returns {Array} An array of random members or an empty array if the set is empty or does not exist.
     */
    spop(key, count = 1) {
        const set = this.store.get(key);
        if (set === undefined) {
            return [];
        }
        if (!(set instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }

        const poppedMembers = [];
        for (const member of set) {
            if (poppedMembers.length >= count) {
                break;
            }
            poppedMembers.push(member);
            set.delete(member);
        }

        return poppedMembers;
    }

    /**
     * Get one or multiple random members from a set without removing them.
     * @param {*} key - The key of the set.
     * @param {number} [count=1] - The number of random members to return.
     * @returns {Array} An array of random members or an empty array if the set is empty or does not exist.
     */
    srandmember(key, count = 1) {
        const set = this.store.get(key);
        if (set === undefined) {
            return [];
        }
        if (!(set instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }

        const members = Array.from(set);
        const result = [];
        for (let i = 0; i < count && i < members.length; i++) {
            const randomIndex = Math.floor(Math.random() * members.length);
            result.push(members[randomIndex]);
            members.splice(randomIndex, 1);
        }
        return result;
    }

    /**
     * Remove one or more members from a set.
     * @param {*} key - The key of the set.
     * @param {...string} members - The members to remove from the set.
     * @returns {number} The number of members removed from the set.
     */
    srem(key, ...members) {
        const set = this.store.get(key);
        if (set === undefined) {
            return 0;
        }
        if (!(set instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }

        let removedCount = 0;
        for (const member of members) {
            if (set.delete(member)) {
                removedCount++;
            }
        }
        return removedCount;
    }

    /**
     * Iterates the set elements using a cursor.
     * @param {*} key - The key of the set.
     * @param {number} cursor - The cursor to start the iteration from.
     * @param {Object} [options] - The optional configuration object.
     * @param {string} [options.match] - A pattern to match the returned elements.
     * @param {number} [options.count] - The number of elements to return in each iteration.
     * @returns {[number, Array]} An array containing the next cursor and an array of elements.
     */
    sscan(key, cursor, options = {}) {
        const { match = '*', count = 10 } = options;
        const set = this.store.get(key);
        if (set === undefined) {
            return [0, []];
        }
        if (!(set instanceof Set)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }

        const regex = new RegExp(match.replace('*', '.*'));
        const members = Array.from(set);
        const result = [];
        let newCursor = cursor;
        for (let i = cursor; i < members.length && result.length < count; i++) {
            if (regex.test(members[i])) {
                result.push(members[i]);
            }
            newCursor = i + 1;
        }
        return [newCursor >= members.length ? 0 : newCursor, result];
    }

    /**
     * Computes the union of the sets stored at the specified keys.
     * @param {...string} keys - The keys of the sets to compute the union for.
     * @returns {Array} An array containing the members of the union or an empty array if no sets exist.
     */
    sunion(...keys) {
        const resultSet = new Set();
        for (const key of keys) {
            const set = this.store.get(key) || new Set();
            if (!(set instanceof Set)) {
                throw new Error('ERR Operation against a key holding the wrong kind of value');
            }
            for (const member of set) {
                resultSet.add(member);
            }
        }
        return Array.from(resultSet);
    }

    /**
     * Computes the union of the sets stored at the specified keys and stores the result in a new set at the destination key.
     * @param {string} destination - The key to store the resulting set.
     * @param {...string} keys - The keys of the sets to compute the union for.
     * @returns {number} The number of members in the resulting set.
     */
    sunionstore(destination, ...keys) {
        const resultSet = new Set();
        for (const key of keys) {
            const set = this.store.get(key) || new Set();
            if (!(set instanceof Set)) {
                throw new Error('ERR Operation against a key holding the wrong kind of value');
            }
            for (const member of set) {
                resultSet.add(member);
            }
        }
        this.storeSet(destination, resultSet);
        return resultSet.size;
    }

    /**
     * Sets the value of an element in a list by its index.
     * @param {*} key - The key of the list.
     * @param {number} index - The index of the element to set the value for.
     * @param {*} value - The value to set.
     * @returns {string} "OK" if the value is successfully set or an error if the index is out of range.
     */
    lset(key, index, value) {
        const list = this.store.get(key);
        if (list === undefined) {
            throw new Error('ERR no such key');
        }
        if (!Array.isArray(list)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        if (index < 0 || index >= list.length) {
            throw new Error('ERR index out of range');
        }

        list[index] = value;
        return true;
    }

    /**
     * Trims a list to the specified range.
     * @param {*} key - The key of the list.
     * @param {number} start - The start index of the range to trim.
     * @param {number} stop - The end index of the range to trim.
     * @returns {string} "OK" if the list is successfully trimmed or an error if the key holds a wrong kind of value.
     */
    ltrim(key, start, stop) {
        const list = this.store.get(key);
        if (list === undefined) {
            return true;
        }
        if (!Array.isArray(list)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }

        const length = list.length;
        const newStart = start >= 0 ? start : Math.max(length + start, 0);
        const newStop = stop >= 0 ? stop : Math.max(length + stop, -1);
        const newList = list.slice(newStart, newStop + 1);

        this.storeSet(key, newList);
        return true;
    }

    /**
     * Removes and returns the last element of the list stored at the specified key.
     * @param {*} key - The key of the list.
     * @returns {*} The last element of the list or null if the key does not exist.
     */
    rpop(key) {
        const list = this.store.get(key);
        if (list === undefined || !Array.isArray(list)) {
            return null;
        }
        return list.pop();
    }

    /**
     * Removes the last element of the list stored at the specified key and pushes it to the list stored at the destination key.
     * @param {*} source - The key of the list to pop the element from.
     * @param {*} destination - The key of the list to push the element to.
     * @returns {*} The last element of the list or null if the key does not exist.
     */
    rpoplpush(source, destination) {
        const element = this.rpop(source);
        if (element === undefined) {
            return null;
        }
        this.lpush(destination, element);
        return element;
    }

    /**
     * Adds values to the end of the list stored at the specified key.
     * @param {*} key - The key of the list.
     * @param {...*} values - The values to add to the list.
     * @returns {number} The length of the list after the push operation.
     */
    rpush(key, ...values) {
        let list = this.store.get(key);
        if (list === undefined) {
            list = [];
            this.storeSet(key, list);
        } else if (!Array.isArray(list)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        list.push(...values);
        return list.length;
    }

    /**
     * Adds values to the end of the list stored at the specified key if the key exists and stores a list.
     * @param {*} key - The key of the list.
     * @param {*} value - The value to add to the list.
     * @returns {number} The length of the list after the push operation.
     */
    rpushx(key, value) {
        const list = this.store.get(key);
        if (list === undefined || !Array.isArray(list)) {
            return 0;
        }
        list.push(value);
        return list.length;
    }

    /**
     * Adds values to the beginning of the list stored at the specified key.
     * @param {*} key - The key of the list.
     * @param {...*} values - The values to add to the list.
     * @returns {number} The length of the list after the push operation.
     */
    lpush(key, ...values) {
        let list = this.store.get(key);
        if (list === undefined) {
            list = [];
            this.storeSet(key, list);
        } else if (!Array.isArray(list)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        list.unshift(...values);
        return list.length;
    }

    /**
     * Adds values to the beginning of the list stored at the specified key if the key exists and stores a list.
     * @param {*} key - The key of the list.
     * @param {*} value - The value to add to the list.
     * @returns {number} The length of the list after the push operation.
     */
    lpushx(key, ...values) {
        const list = this.store.get(key);
        if (list === undefined || !Array.isArray(list)) {
            return 0;
        }
        list.unshift(...values);
        return list.length;
    }

    /**
     * Retrieve a range of elements from a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @param {number} start - The start index of the range (inclusive). If negative, it counts from the end of the list.
     * @param {number} stop - The end index of the range (inclusive). If negative, it counts from the end of the list.
     * @returns {Array} - An array containing the requested range of elements.
     *                    Returns an empty array if the key does not exist,
     *                    or if the stored value is not an array.
     */
    lrange(key, start, stop) {
        const list = this.store.get(key);
        if (list === undefined || !Array.isArray(list)) {
            return [];
        }
        const length = list.length;
        const newStart = start >= 0 ? start : Math.max(length + start, 0);
        const newStop = stop >= 0 ? stop : Math.max(length + stop, -1);
        return list.slice(newStart, newStop + 1);
    }

    /**
     * Remove elements with the given value from a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @param {number} count - The number of occurrences to remove.
     * @param {*} value - The value of the elements to remove.
     * @returns {number} - The number of removed elements.
     */
    lrem(key, count, value) {
        const list = this.store.get(key);
        if (list === undefined || !Array.isArray(list)) {
            return 0;
        }

        let removed = 0;
        if (count > 0) {
            for (let i = 0; i < list.length && removed < count; i++) {
                if (list[i] === value) {
                    list.splice(i, 1);
                    removed++;
                    i--;
                }
            }
        } else if (count < 0) {
            for (let i = list.length - 1; i >= 0 && removed < -count; i--) {
                if (list[i] === value) {
                    list.splice(i, 1);
                    removed++;
                }
            }
        } else {
            removed = list.filter(item => item === value).length;
            this.storeSet(key, list.filter(item => item !== value));
        }

        return removed;
    }

    /**
     * Pop an element from a list stored at the source key and push it to a list stored at the destination key.
     *
     * @param {string} source - The key where the source list is stored.
     * @param {string} destination - The key where the destination list is stored.
     * @param {string} srcDirection - The direction to pop from the source list ('LEFT' or 'RIGHT').
     * @param {string} destDirection - The direction to push to the destination list ('LEFT' or 'RIGHT').
     * @returns {*} - The element moved or null if the source list is empty.
     */
    lmove(source, destination, srcDirection, destDirection) {
        const popFn = srcDirection === 'LEFT' ? 'lpop' : 'rpop';
        const pushFn = destDirection === 'LEFT' ? 'lpush' : 'rpush';

        const element = this[popFn](source);
        if (element === undefined) {
            return null;
        }
        this[pushFn](destination, element);
        return element;
    }

    /**
     * Pop multiple elements from a list stored at the given key in the specified direction.
     *
     * @param {number} count - The number of elements to pop.
     * @param {*} key - The key where the list is stored.
     * @param {string} direction - The direction to pop from the list ('LEFT' or 'RIGHT').
     * @returns {Array} - An array of popped elements.
     */
    lmpop(count, key, direction) {
        const popFn = direction === 'LEFT' ? 'lpop' : 'rpop';
        const results = [];

        for (let i = 0; i < count; i++) {
            const value = this[popFn](key);
            if (value === undefined) {
                break;
            }
            results.push(value);
        }

        return results;
    }

    /**
     * Pop an element from the left end of a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @returns {*} - The popped element or null if the list is empty.
     */
    lpop(key) {
        const list = this.store.get(key);
        if (list === undefined || !Array.isArray(list)) {
            return null;
        }
        return list.shift();
    }

    /**
    * Find the position of an element in a list stored at the given key.
    *
    * @param {*} key - The key where the list is stored.
    * @param {*} element - The element to search for.
    * @param {Object} options - An object with optional parameters.
    * @param {number} options.rank - The rank of the element to find (default is 0).
    * @param {number} options.start - The start index of the search (default is 0).
    * @param {number} options.stop - The stop index of the search (default is -1).
    * @returns {number|undefined} - The position of the element, or undefined if not found.
    */
    lpos(key, element, options = {}) {
        const { rank = 0, start = 0, stop = -1 } = options;
        const list = this.store.get(key);

        if (list === undefined || !Array.isArray(list)) {
            return undefined;
        }

        let currentRank = 0;
        const length = list.length;
        const newStart = start >= 0 ? start : Math.max(length + start, 0);
        const newStop = stop >= 0 ? stop : Math.max(length + stop, -1);

        for (let i = newStart; i <= newStop; i++) {
            if (list[i] === element) {
                if (currentRank === rank) {
                    return i;
                }
                currentRank++;
            }
        }

        return undefined;
    }

    /**
     * Pop an element from the right end of a list stored at the source key and push it to the left end of a list stored at the destination key.
     *
     * @param {string} source - The key where the source list is stored.
     * @param {string} destination - The key where the destination list is stored.
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @returns {*} - The element moved or null if the source list is empty.
     */
    brpoplpush(source, destination, timeout) {
        const element = this.brpop(source, timeout);
        if (element === undefined) {
            return null;
        }
        this.lpush(destination, element);
        return element;
    }

    /**
     * Get the element at the specified index in a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @param {number} index - The index of the element to retrieve.
     * @returns {*} - The element at the specified index or null if the index is out of range.
     */
    lindex(key, index) {
        const list = this.store.get(key);
        if (list === undefined || !Array.isArray(list)) {
            return null;
        }
        if (index < 0) {
            index = list.length + index;
        }
        return list[index] !== undefined ? list[index] : null;
    }

    /**
     * Insert an element before or after a pivot element in a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @param {string} position - The position to insert the new element ('BEFORE' or 'AFTER').
     * @param {*} pivot - The pivot element to insert the new element before or after.
     * @param {*} value - The value of the new element to insert.
     * @returns {number} - The length of the list after the insert operation.
     */
    linsert(key, position, pivot, value) {
        const list = this.store.get(key);
        if (list === undefined) {
            return 0;
        }
        if (!Array.isArray(list)) {
            throw new Error('ERR Operation against a key holding the wrong kind of value');
        }
        const pivotIndex = list.indexOf(pivot);
        if (pivotIndex === -1) {
            return 0;
        }

        if (position === 'BEFORE') {
            list.splice(pivotIndex, 0, value);
        } else if (position === 'AFTER') {
            list.splice(pivotIndex + 1, 0, value);
        } else {
            throw new Error('ERR syntax error');
        }

        return list.length;
    }

    /**
     * Get the length of a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @returns {number} - The length of the list.
     */
    llen(key) {
        const list = this.store.get(key);
        return list === undefined ? 0 : list.length;
    }

    /**
     * Pop an element from a list stored at the source key and push it to a list stored at the destination key, blocking until an element is available or the timeout expires.
     *
     * @param {string} source - The key where the source list is stored.
     * @param {string} destination - The key where the destination list is stored.
     * @param {string} srcDirection - The direction to pop from the source list ('LEFT' or 'RIGHT').
     * @param {string} destDirection - The direction to push to the destination list ('LEFT' or 'RIGHT').
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @returns {*} - The element moved or null if the source list is empty or the timeout expires.
     */
    blmove(source, destination, srcDirection, destDirection, timeout) {
        const popFn = srcDirection === 'LEFT' ? 'blpop' : 'brpop';
        const pushFn = destDirection === 'LEFT' ? 'lpush' : 'rpush';

        const element = this[popFn]([source], timeout);
        if (element === undefined) {
            return null;
        }
        this[pushFn](destination, element[1]);
        return element[1];
    }

    /**
     * Pop multiple elements from a list stored at the given keys in a blocking manner, waiting until at least one element is available or the timeout expires.
     *
     * @param {number} count - The number of elements to pop.
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @param {...string} keys - The keys where the lists are stored.
     * @returns {Array} - An array of popped elements.
     */
    blmpop(count, timeout, ...keys) {
        const results = [];
        const timeoutMs = timeout * 1000;

        const popFn = keys.length === 1 ? 'brpop' : 'brpoplpush';
        const popArgs = keys.concat(timeoutMs);

        for (let i = 0; i < count; i++) {
            const value = this[popFn](popArgs);
            if (value === undefined) {
                break;
            }
            results.push(value);
        }

        return results;
    }

    /**
     * Pop an element from the left end of a list stored at the given keys in a blocking manner, waiting until an element is available or the timeout expires.
     *
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @param {...string} keys - The keys where the lists are stored.
     * @returns {Array|null} - An array containing the key and the popped element, or null if no element is available or the timeout expires.
     */
    blpop(timeout, ...keys) {
        return this.blmpop(1, timeout, ...keys)[0];
    }

    /**
     * Pop an element from the right end of a list stored at the given keys in a blocking manner, waiting until an element is available or the timeout expires.
     *
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @param {...string} keys - The keys where the lists are stored.
     * @returns {Array|null} - An array containing the key and the popped element, or null if no element is available or the timeout expires.
     */
    brpop(timeout, ...keys) {
        const timeoutMs = timeout * 1000;
        const endTime = Date.now() + timeoutMs;

        while (Date.now() < endTime) {
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const list = this.store.get(key);
                if (list !== undefined && Array.isArray(list) && list.length > 0) {
                    const element = list.pop();
                    if (list.length === 0) {
                        this.store.delete(key);
                    }
                    return [key, element];
                }
            }
        }

        return null;
    }

    /**
     * Get the expire time of a key in seconds.
     *
     * @param {*} key - The key to get the expire time for.
     * @returns {number|undefined} - The expire time in seconds, or undefined if the key has no expire time.
     */
    expiretime(key) {
        return this.expireTimes.get(key);
    }

    /**
     * Get the expire time of a key in milliseconds.
     *
     * @param {*} key - The key to get the expire time for.
     * @returns {number|undefined} - The expire time in milliseconds, or undefined if the key has no expire time.
     */
    pexpiretime(key) {
        const expireTime = this.expireTimes.get(key);
        return expireTime ? expireTime * 1000 : null;
    }

    /**
     * Add a member with the specified score to a sorted set stored at the given key.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} score - The score associated with the member.
     * @param {*} member - The member to add to the sorted set.
     * @returns {number} - The number of elements added to the sorted set (0 or 1).
     */
    zadd(key, score, member) {
        const isExpired = this._checkAndRemoveExpiredKey(key);
        if (isExpired) {
            return 0;
        }

        if (!this.store.has(key)) {
            this.storeSet(key, new XMap());
        }

        const sortedSet = this.store.get(key);
        sortedSet.set(member, Number(score));
        return 1;
    }

    /**
     * Get the number of members in a sorted set stored at the given key.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @returns {number} - The number of members in the sorted set.
     */
    zcard(key) {
        const isExpired = this._checkAndRemoveExpiredKey(key);
        if (isExpired) {
            return 0;
        }

        if (!this.store.has(key)) {
            return 0;
        }

        const sortedSet = this.store.get(key);
        return sortedSet.size;
    }

    /**
     * Count the number of members in a sorted set stored at the given key with a score between min and max (inclusive).
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} min - The minimum score.
     * @param {number} max - The maximum score.
     * @returns {number} - The number of members with a score between min and max.
     */
    zcount(key, min, max) {
        const isExpired = this._checkAndRemoveExpiredKey(key);
        if (isExpired) {
            return 0;
        }

        if (!this.store.has(key)) {
            return 0;
        }

        const sortedSet = this.store.get(key);
        let count = 0;

        for (const score of sortedSet.values()) {
            if (score >= min && score <= max) {
                count++;
            }
        }

        return count;
    }

    /**
     * Compute the difference between the members of the given sorted sets stored at the specified keys.
     *
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {Set} - A set containing the members present in the first sorted set but not in the others.
     */
    zdiff(...keys) {
        if (keys.length === 0) {
            return new Set();
        }

        const sortedSets = keys.map(key => {
            const isExpired = this._checkAndRemoveExpiredKey(key);
            if (isExpired) {
                return new XMap();
            }
            return this.store.get(key) || new XMap();
        });

        const firstSet = new Set(sortedSets[0].keys());
        for (let i = 1; i < sortedSets.length; i++) {
            for (const member of sortedSets[i].keys()) {
                firstSet.delete(member);
            }
        }

        return firstSet;
    }

    /**
     * Compute the difference between the given sorted sets stored at the specified keys and store the result in the destination key.
     *
     * @param {string} destination - The key where the result will be stored.
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {number} - The number of members in the resulting sorted set.
     */
    zdiffstore(destination, ...keys) {
        const diff = this.ZDIFF(...keys);
        const resultMap = new XMap();

        for (const member of diff) {
            const scores = keys.map(key => {
                const sortedSet = this.store.get(key);
                return sortedSet ? sortedSet.get(member) : undefined;
            }).filter(score => score !== undefined);

            if (scores.length > 0) {
                resultMap.set(member, Math.min(...scores));
            }
        }

        this.storeSet(destination, resultMap);
        return resultMap.size;
    }

    /**
     * Blockingly pop members with the lowest scores from multiple sorted sets.
     *
     * @param {number} count - The number of members to pop.
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {Array} - An array containing the key and the popped members with their scores.
     */
    bzmpop(count, ...keys) {
        const result = [];

        for (const key of keys) {
            const sortedSet = this.store.get(key);
            if (sortedSet && sortedSet.size > 0) {
                const poppedMembers = Array.from(sortedSet.entries())
                    .sort((a, b) => a[1] - b[1])
                    .slice(0, count)
                    .map(([member, score]) => {
                        sortedSet.delete(member);
                        return [member, score];
                    });

                result.push([key, ...poppedMembers]);
                break;
            }
        }

        return result;
    }

    /**
     * Pop the specified number of members with the highest scores from a sorted set.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} count - The number of members to pop.
     * @returns {Array} - An array containing the key and the popped members with their scores.
     */
    bzpopmax(key, count) {
        const sortedSet = this.store.get(key);
        if (!sortedSet || sortedSet.size === 0) {
            return [];
        }

        const poppedMembers = Array.from(sortedSet.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([member, score]) => {
                sortedSet.delete(member);
                return [member, score];
            });

        return [key, ...poppedMembers];
    }

    /**
     * Pop the specified number of members with the lowest scores from a sorted set.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} count - The number of members to pop.
     * @returns {Array} - An array containing the key and the popped members with their scores.
     */
    bzpopmin(key, count) {
        const sortedSet = this.store.get(key);
        if (!sortedSet || sortedSet.size === 0) {
            return [];
        }

        const poppedMembers = Array.from(sortedSet.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, count)
            .map(([member, score]) => {
                sortedSet.delete(member);
                return [member, score];
            });

        return [key, ...poppedMembers];
    }

    /**
     * Increment the score of a member in a sorted set by the specified increment value.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} increment - The value to increment the score by.
     * @param {*} member - The member whose score to increment.
     * @returns {number} - The new score of the member.
     */
    zincrby(key, increment, member) {
        if (!this.store.has(key)) {
            this.storeSet(key, new XMap());
        }

        const sortedSet = this.store.get(key);
        const currentScore = sortedSet.get(member) || 0;
        const newScore = currentScore + Number(increment);
        sortedSet.set(member, newScore);
        return newScore;
    }

    /**
     * Compute the intersection between the members of the given sorted sets stored at the specified keys.
     *
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {Set} - A set containing the members present in all the sorted sets.
     */
    zinter(...keys) {
        if (keys.length === 0) {
            return new Set();
        }

        const sortedSets = keys.map(key => this.store.get(key) || new XMap());
        const firstSet = new Set(sortedSets[0].keys());
        for (let i = 1; i < sortedSets.length; i++) {
            const intersection = new Set();
            for (const member of sortedSets[i].keys()) {
                if (firstSet.has(member)) {
                    intersection.add(member);
                }
            }
            firstSet.clear();
            for (const member of intersection) {
                firstSet.add(member);
            }
        }

        return firstSet;
    }

    /**
     * Get the number of members in the intersection between the given sorted sets stored at the specified keys.
     *
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {number} - The number of members in the intersection.
     */
    zintercard(...keys) {
        const intersection = this.ZINTER(...keys);
        return intersection.size;
    }

    /**
     * Compute the intersection between the given sorted sets stored at the specified keys and store the result in the destination key.
     *
     * @param {string} destination - The key where the result will be stored.
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {number} - The number of members in the resulting sorted set.
     */
    zinterstore(destination, ...keys) {
        const intersection = this.ZINTER(...keys);
        const resultMap = new XMap();

        for (const member of intersection) {
            const scores = keys.map(key => {
                const sortedSet = this.store.get(key);
                return sortedSet ? sortedSet.get(member) : undefined;
            }).filter(score => score !== undefined);

            if (scores.length > 0) {
                resultMap.set(member, Math.max(...scores));
            }
        }

        this.storeSet(destination, resultMap);
        return resultMap.size;
    }

    /**
     * Count the number of members in a sorted set stored at the given key with scores between the given min and max values.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {*} min - The minimum score.
     * @param {*} max - The maximum score.
     * @returns {number} - The number of members with scores between min and max.
     */
    zlexcount(key, min, max) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.keys()).sort();
        let count = 0;

        for (const member of sortedMembers) {
            if (member >= min && member <= max) {
                count++;
            }
        }

        return count;
    }

    /**
     * Pop the specified number of members with the lowest scores from the given sorted sets.
     *
     * @param {number} count - The number of members to pop.
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {Array} - An array containing the key and the popped members with their scores.
     */
    zmpop(count, ...keys) {
        const result = [];

        for (const key of keys) {
            const sortedSet = this.store.get(key);
            if (sortedSet && sortedSet.size > 0) {
                const poppedMembers = Array.from(sortedSet.entries())
                    .sort((a, b) => a[1] - b[1])
                    .slice(0, count)
                    .map(([member, score]) => {
                        sortedSet.delete(member);
                        return [member, score];
                    });

                result.push([key, ...poppedMembers]);
                break;
            }
        }

        return result;
    }

    /**
     * Get the scores of the specified members in a sorted set stored at the given key.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {...*} members - The members whose scores to retrieve.
     * @returns {Array} - An array containing the scores of the specified members.
     */
    zmscore(key, ...members) {
        const sortedSet = this.store.get(key) || new XMap();
        return members.map(member => sortedSet.get(member));
    }

    /**
     * Pop the specified number of members with the highest scores from a sorted set.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} count - The number of members to pop.
     * @returns {Array} - An array containing the popped members with their scores.
     */
    zpopmax(key, count) {
        const sortedSet = this.store.get(key);
        if (!sortedSet || sortedSet.size === 0) {
            return [];
        }

        const poppedMembers = Array.from(sortedSet.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([member, score]) => {
                sortedSet.delete(member);
                return [member, score];
            });

        return poppedMembers;
    }

    /**
     * Pop the specified number of members with the lowest scores from a sorted set.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} count - The number of members to pop.
     * @returns {Array} - An array containing the popped members with their scores.
     */
    zpopmin(key, count) {
        const sortedSet = this.store.get(key);
        if (!sortedSet || sortedSet.size === 0) {
            return [];
        }

        const poppedMembers = Array.from(sortedSet.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, count)
            .map(([member, score]) => {
                sortedSet.delete(member);
                return [member, score];
            });

        return poppedMembers;
    }

    /**
     * Get the specified number of random members from a sorted set stored at the given key.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} [count=1] - The number of random members to retrieve.
     * @returns {Array} - An array containing the randomly chosen members.
     */
    zrandmember(key, count = 1) {
        const sortedSet = this.store.get(key);
        if (!sortedSet || sortedSet.size === 0) {
            return [];
        }

        const members = Array.from(sortedSet.keys());
        const result = [];

        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * members.length);
            result.push(members[randomIndex]);
        }

        return result;
    }

    /**
     * Get the members in a sorted set stored at the given key with their scores between the specified start and stop indices.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} start - The start index.
     * @param {number} stop - The stop index.
     * @returns {Array} - An array containing the members and their scores within the specified range.
     */
    zrange(key, start, stop) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => a[1] - b[1]);

        if (start < 0) start = sortedMembers.length + start;
        if (stop < 0) stop = sortedMembers.length + stop;

        return sortedMembers.slice(start, stop + 1).map(([member, score]) => [member, score]);
    }

    /**
     * Returns all elements in the sorted set stored at the key with a value between min and max (inclusive) in lexicographical order.
     * @param {*} key - The key of the sorted set.
     * @param {string} min - The minimum member value.
     * @param {string} max - The maximum member value.
     * @param {Object} [options={}] - Additional options (e.g., { limit: { offset, count } }).
     * @returns {string[]} - The filtered and sorted set members.
     */
    zrangebylex(key, min, max, options = {}) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.keys()).sort();

        let result = sortedMembers.filter(member => member >= min && member <= max);

        if (options.limit) {
            const { offset, count } = options.limit;
            result = result.slice(offset, offset + count);
        }

        return result;
    }

    /**
     * Returns all elements in the sorted set stored at the key with a score between min and max (inclusive).
     * @param {*} key - The key of the sorted set.
     * @param {number} min - The minimum score value.
     * @param {number} max - The maximum score value.
     * @param {Object} [options={}] - Additional options (e.g., { withscores: true, limit: { offset, count } }).
     * @returns {(string[]|Array[])} - The filtered and sorted set members, with or without scores based on options.
     */
    zrangebyscore(key, min, max, options = {}) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => a[1] - b[1]);

        let result = sortedMembers.filter(([, score]) => score >= min && score <= max);

        if (options.withscores) {
            result = result.map(([member, score]) => [member, score]);
        } else {
            result = result.map(([member]) => member);
        }

        if (options.limit) {
            const { offset, count } = options.limit;
            result = result.slice(offset, offset + count);
        }

        return result;
    }

    /**
     * Copies a range of elements from a sorted set to another sorted set.
     * @param {string} destination - The destination key for the new sorted set.
     * @param {*} key - The key of the source sorted set.
     * @param {number} start - The starting index.
     * @param {number} stop - The ending index.
     * @returns {number} - The number of elements in the new sorted set.
     */
    zrangestore(destination, key, start, stop) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => a[1] - b[1]);

        if (start < 0) start = sortedMembers.length + start;
        if (stop < 0) stop = sortedMembers.length + stop;

        const resultMap = new XMap(sortedMembers.slice(start, stop + 1));
        this.storeSet(destination, resultMap);
        return resultMap.size;
    }

    /**
     * Determines the index of a member in the sorted set stored at the key.
     * @param {*} key - The key of the sorted set.
     * @param {string} member - The member to find the index of.
     * @returns {(number|undefined)} - The index of the member, or undefined if not found.
     */
    zrank(key, member) {
        const sortedSet = this.store.get(key);
        if (!sortedSet)
            return undefined;

        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => a[1] - b[1]);
        for (let i = 0; i < sortedMembers.length; i++) {
            if (sortedMembers[i][0] === member) {
                return i;
            }
        }

        return undefined;
    }

    /**
     * Removes one or more members from the sorted set stored at the key.
     * @param {*} key - The key of the sorted set.
     * @param {...string} members - The members to remove from the sorted set.
     * @returns {number} - The number of members removed.
     */
    zrem(key, ...members) {
        const sortedSet = this.store.get(key);
        if (!sortedSet) {
            return 0;
        }

        let removedCount = 0;
        for (const member of members) {
            if (sortedSet.delete(member)) {
                removedCount++;
            }
        }

        return removedCount;
    }

    /**
     * Removes all elements in the sorted set stored at the key with a value between min and max (inclusive) in lexicographical order.
     * @param {*} key - The key of the sorted set.
     * @param {string} min - The minimum member value.
     * @param {string} max - The maximum member value.
     * @returns {number} - The number of members removed.
     */
    zremrangebylex(key, min, max) {
        const sortedSet = this.store.get(key);
        if (!sortedSet) {
            return 0;
        }

        const sortedMembers = Array.from(sortedSet.keys()).sort();
        let removedCount = 0;

        for (const member of sortedMembers) {
            if (member >= min && member <= max) {
                sortedSet.delete(member);
                removedCount++;
            }
        }

        return removedCount;
    }

    /**
     * Removes all elements in the sorted set stored at key with rank between start and stop.
     * @param {string} key - The key of the sorted set.
     * @param {number} start - The start rank.
     * @param {number} stop - The stop rank.
     * @returns {number} - The number of elements removed.
     */
    zremrangebyrank(key, start, stop) {
        const sortedSet = this.store.get(key);
        if (!sortedSet) {
            return 0;
        }

        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => a[1] - b[1]);

        if (start < 0) start = sortedMembers.length + start;
        if (stop < 0) stop = sortedMembers.length + stop;

        let removedCount = 0;
        for (let i = start; i <= stop; i++) {
            if (sortedSet.delete(sortedMembers[i][0])) {
                removedCount++;
            }
        }

        return removedCount;
    }

    /**
     * Removes all elements in the sorted set stored at key with a score between min and max (inclusive).
     * @param {string} key - The key of the sorted set.
     * @param {number} min - The minimum score.
     * @param {number} max - The maximum score.
     * @returns {number} - The number of elements removed.
     */
    zremrangebyscore(key, min, max) {
        const sortedSet = this.store.get(key);
        if (!sortedSet) {
            return 0;
        }

        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => a[1] - b[1]);
        let removedCount = 0;

        for (const [member, score] of sortedMembers) {
            if (score >= min && score <= max) {
                sortedSet.delete(member);
                removedCount++;
            }
        }

        return removedCount;
    }

    /**
     * Returns the specified range of elements in the sorted set stored at key in reverse order.
     * @param {string} key - The key of the sorted set.
     * @param {number} start - The start index.
     * @param {number} stop - The stop index.
     * @returns {Array} - The specified range of elements in reverse order.
     */
    zrevrange(key, start, stop) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => b[1] - a[1]);

        if (start < 0) start = sortedMembers.length + start;
        if (stop < 0) stop = sortedMembers.length + stop;

        return sortedMembers.slice(start, stop + 1).map(([member, score]) => [member, score]);
    }

    /**
     * Returns all elements in the sorted set stored at key with a value between max and min.
     * @param {string} key - The key of the sorted set.
     * @param {*} max - The maximum value.
     * @param {*} min - The minimum value.
     * @param {Object} options - Additional options.
     * @returns {Array} - The specified range of elements.
     */
    zrevrangebylex(key, max, min, options = {}) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.keys()).sort().reverse();

        let result = sortedMembers.filter(member => member >= min && member <= max);

        if (options.limit) {
            const { offset, count } = options.limit;
            result = result.slice(offset, offset + count);
        }

        return result;
    }

    /**
     * Returns all elements in the sorted set stored at key with a score between max and min (inclusive) in reverse order.
     * @param {string} key - The key of the sorted set.
     * @param {number} max - The maximum score.
     * @param {number} min - The minimum score.
     * @param {Object} options - Additional options.
     * @returns {Array} - The specified range of elements in reverse order.
     */
    zrevrangebyscore(key, max, min, options = {}) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => b[1] - a[1]);

        let result = sortedMembers.filter(([, score]) => score >= min && score <= max);

        if (options.withscores) {
            result = result.map(([member, score]) => [member, score]);
        } else {
            result = result.map(([member]) => member);
        }

        if (options.limit) {
            const { offset, count } = options.limit;
            result = result.slice(offset, offset + count);
        }

        return result;
    }

    /**
     * Returns the rank of member in the sorted set stored at key, with the scores ordered from high to low.
     * @param {string} key - The key of the sorted set.
     * @param {*} member - The member whose rank to determine.
     * @returns {number|undefined} - The rank of the member, or undefined if the member or sorted set does not exist.
     */
    zrevrank(key, member) {
        const sortedSet = this.store.get(key);
        if (!sortedSet) {
            return undefined;
        }

        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => b[1] - a[1]);
        for (let i = 0; i < sortedMembers.length; i++) {
            if (sortedMembers[i][0] === member) {
                return i;
            }
        }

        return undefined;
    }

    /**
     * Incrementally iterates the elements of the sorted set stored at key.
     * @param {string} key - The key of the sorted set.
     * @param {number} cursor - The cursor position.
     * @param {Object} options - Additional options.
     * @returns {Array} - An array containing the next cursor and the result.
     */
    zscan(key, cursor, options = {}) {
        const sortedSet = this.store.get(key) || new XMap();
        const sortedMembers = Array.from(sortedSet.entries()).sort((a, b) => a[1] - b[1]);
        const result = [];

        let count = options.count || 10;
        let index = cursor;

        while (count > 0 && index < sortedMembers.length) {
            if (!options.match || new RegExp(options.match.replace('*', '.*')).test(sortedMembers[index][0])) {
                result.push(sortedMembers[index]);
                count--;
            }
            index++;
        }

        return [index >= sortedMembers.length ? 0 : index, result];
    }

    /**
     * Returns the score of a member in the sorted set stored at key.
     * @param {string} key - The key of the sorted set.
     * @param {*} member - The member whose score to retrieve.
     * @returns {number|undefined} - The score of the member, or undefined if the member or sorted set does not exist.
     */
    zscore(key, member) {
        const sortedSet = this.store.get(key);
        if (!sortedSet)
            return undefined;

        return sortedSet.get(member);
    }

    /**
     * Computes the union of multiple sorted sets specified by the keys array.
     * @param {Array<string>} keys - An array of keys identifying the sorted sets to be combined.
     * @returns {Array} - The union of the specified sorted sets, sorted by score.
     */
    zunion(keys) {
        const unionMap = new XMap();

        for (const key of keys) {
            const sortedSet = this.store.get(key);
            if (sortedSet) {
                for (const [member, score] of sortedSet.entries()) {
                    unionMap.set(member, (unionMap.get(member) || 0) + score);
                }
            }
        }

        return Array.from(unionMap.entries()).sort((a, b) => a[1] - b[1]);
    }

    /**
     * Computes the union of multiple sorted sets specified by the keys array and stores the result in a new sorted set with the given destination key.
     * @param {string} destination - The key of the new sorted set where the result will be stored.
     * @param {Array<string>} keys - An array of keys identifying the sorted sets to be combined.
     * @returns {number} - The size of the resulting sorted set.
     */
    zunionstore(destination, keys) {
        const unionResult = this.zunion(keys);
        const resultMap = new XMap(unionResult);
        this.storeSet(destination, resultMap);
        return resultMap.size;
    }

    /**
     * Adds the specified geospatial item to the sorted set stored at key.
     * @param {*} key - The key of the sorted set.
     * @param {number} longitude - The longitude of the geospatial item.
     * @param {number} latitude - The latitude of the geospatial item.
     * @param {string} member - The member to be added to the sorted set.
     * @returns {number} - The number of elements added to the sorted set (0 or 1).
     */
    geoadd(key, longitude, latitude, member) {
        if (typeof longitude !== 'number' || typeof latitude !== 'number') {
            throw new Error('Invalid longitude or latitude value');
        }

        const sortedSet = this.store.get(key) || new XMap();
        const existingMember = sortedSet.get(member);

        if (!existingMember) {
            const geoData = { longitude, latitude };
            sortedSet.set(member, geoData);
            this.storeSet(key, sortedSet);
            return 1;
        }

        return 0;
    }
    /**
     * Calculates the distance between two geospatial items.
     * @param {*} key - The key of the sorted set.
     * @param {string} member1 - The first member in the sorted set.
     * @param {string} member2 - The second member in the sorted set.
     * @param {string} [unit='m'] - The unit of the returned distance (m, km, mi, ft).
     * @returns {number|undefined} - The distance between the two members or undefined if not found.
     */
    geodist(key, member1, member2, unit = 'm') {
        const sortedSet = this.store.get(key);
        if (!sortedSet)
            return undefined;

        const pos1 = sortedSet.get(member1);
        const pos2 = sortedSet.get(member2);

        if (!pos1 || !pos2)
            return undefined;

        const distance = this._haversineDistance(pos1.latitude, pos1.longitude, pos2.latitude, pos2.longitude);

        return this._convertDistance(distance, unit);
    }

    /**
     * Returns the geohash string of one or more members.
     * @param {*} key - The key of the sorted set.
     * @param {...string} members - One or more members for which to return the geohash.
     * @returns {string[]} - An array of geohash strings for the requested members.
     */
    geohash(key, ...members) {
        const sortedSet = this.store.get(key);
        if (!sortedSet) {
            return [];
        }

        return members.map(member => {
            const pos = sortedSet.get(member);
            return pos ? this._encodeGeohash(pos.latitude, pos.longitude) : null;
        });
    }

    /**
     * Returns the positions (latitude, longitude) of one or more members.
     * @param {*} key - The key of the sorted set.
     * @param {...string} members - One or more members for which to return the positions.
     * @returns {Array<[number, number]>} - An array of positions for the requested members.
     */
    geopos(key, ...members) {
        const sortedSet = this.store.get(key);
        if (!sortedSet) {
            return [];
        }

        return members.map(member => {
            const pos = sortedSet.get(member);
            return pos ? [pos.latitude, pos.longitude] : null;
        });
    }

    /**
     * Returns members of a sorted set whose positions are within the specified radius from the given point.
     * @param {*} key - The key of the sorted set.
     * @param {number} longitude - The longitude of the center point.
     * @param {number} latitude - The latitude of the center point.
     * @param {number} radius - The search radius.
     * @param {string} [unit='m'] - The unit of the search radius (m, km, mi, ft).
     * @returns {string[]} - An array of members within the specified radius.
     */
    georadius(key, longitude, latitude, radius, unit = 'm') {
        const sortedSet = this.store.get(key);
        if (!sortedSet) {
            return [];
        }

        const convertedRadius = this._convertDistance(radius, unit, 'm');
        const result = [];

        for (const [member, pos] of sortedSet.entries()) {
            const distance = this._haversineDistance(latitude, longitude, pos.latitude, pos.longitude);
            if (distance <= convertedRadius) {
                result.push(member);
            }
        }

        return result;
    }

    /**
     * Computes the members of a geospatial index within the given radius (read-only version).
     * @param {number} latitude - The latitude of the center point.
     * @param {number} longitude - The longitude of the center point.
     * @param {number} radius - The radius to search within.
     * @param {string} key - The key of the geospatial index.
     * @returns {Array} - An array of members within the specified radius.
     */
    georadius_ro(latitude, longitude, radius, key) {
        return this.georadius(latitude, longitude, radius, key, true);
    }

    /**
     * Computes the members of a geospatial index within the given radius around a specified member's coordinates.
     * @param {string} key - The key of the geospatial index.
     * @param {*} member - The member around which to search.
     * @param {number} radius - The radius to search within.
     * @returns {Array|undefined} - An array of members within the specified radius or undefined if the member is not found.
     */
    georadiusbymember(key, member, radius) {
        const coord = this.geopos(key, member);
        if (!coord) return undefined;
        return this.georadius(coord[0], coord[1], radius, key);
    }

    /**
     * Computes the members of a geospatial index within the given radius around a specified member's coordinates (read-only version).
     * @param {string} key - The key of the geospatial index.
     * @param {*} member - The member around which to search.
     * @param {number} radius - The radius to search within.
     * @returns {Array|undefined} - An array of members within the specified radius or undefined if the member is not found.
     */
    georadiusbymember_ro(key, member, radius) {
        const coord = this.geopos(key, member);
        if (!coord) return undefined;
        return this.georadius(coord[0], coord[1], radius, key, true);
    }

    /**
     * Searches for members within a specified radius around a given point in a geospatial index.
     * @param {string} key - The key of the geospatial index.
     * @param {number} latitude - The latitude of the center point.
     * @param {number} longitude - The longitude of the center point.
     * @param {number} radius - The radius to search within.
     * @returns {Array} - An array of members within the specified radius.
     */
    geosearch(key, latitude, longitude, radius) {
        return this.georadius(latitude, longitude, radius, key);
    }

    /**
     * Searches for members within a specified radius around a given point in a geospatial index and stores the results in a new key.
     * @param {string} destinationKey - The key where the results will be stored.
     * @param {string} key - The key of the geospatial index.
     * @param {number} latitude - The latitude of the center point.
     * @param {number} longitude - The longitude of the center point.
     * @param {number} radius - The radius to search within.
     * @returns {number} - The number of members found within the specified radius.
     */
    geosearchstore(destinationKey, key, latitude, longitude, radius) {
        const results = this.georadius(latitude, longitude, radius, key);
        this.set(destinationKey, results);
        return results.length;
    }

    /**
     * Scans keys based on the given cursor, match pattern, and count.
     * @param {number} cursor - The starting index for the scan.
     * @param {string} [match='*'] - The pattern to match keys against.
     * @param {number} [count=10] - The maximum number of keys to return.
     * @returns {[number, string[]]} - An array containing the next cursor and the matched keys.
     */
    scan(cursor, match = '*', count = 10) {
        const keys = this.keys(match);
        const endIndex = Math.min(cursor + count, keys.length);
        const nextCursor = endIndex === keys.length ? 0 : endIndex;

        return [nextCursor, keys.slice(cursor, endIndex)];
    }

    /**
     * Sorts the elements in the list, set, or sorted set stored at the key.
     * @param {*} key - The key to retrieve the list, set, or sorted set.
     * @param {string} [order='ASC'] - The order to sort the elements (ASC or DESC).
     * @param {boolean} [alpha=false] - Whether to sort elements alphabetically or numerically.
     * @returns {Array} - The sorted elements.
     */
    sort(key, order = 'ASC', alpha = false) {
        const list = this.store.get(key);
        if (!Array.isArray(list)) return [];

        const sorted = list.slice().sort((a, b) => {
            if (alpha) {
                return order === 'ASC' ? a.localeCompare(b) : b.localeCompare(a);
            } else {
                return order === 'ASC' ? a - b : b - a;
            }
        });

        return sorted;
    }

    /**
     * Alters the last access time of a key(s).
     * @param {...string} keys - The keys to update the access time.
     * @returns {number} - The number of existing keys touched.
     */
    touch(...keys) {
        return keys.reduce((acc, key) => acc + (this.exists(key) ? 1 : 0), 0);
    }

    /**
     * Alias for the sort method that sorts elements in a read-only manner.
     * @param {*} key - The key to retrieve the list, set, or sorted set.
     * @param {string} [order='ASC'] - The order to sort the elements (ASC or DESC).
     * @param {boolean} [alpha=false] - Whether to sort elements alphabetically or numerically.
     * @returns {Array} - The sorted elements.
     */
    sort_ro(key, order = 'ASC', alpha = false) {
        return this.sort(key, order, alpha);
    }

    /**
     * Unlinks (deletes) the specified keys.
     * @param {...string} keys - The keys to be removed.
     * @returns {number} - The number of keys removed.
     */
    unlink(...keys) {
        let removed = 0;
        for (const key of keys) {
            if (this.del(key)) {
                removed++;
            }
        }
        return removed;
    }

    /**
     * Set the value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to set the value for.
     * @param {*} value - The value to set.
     * @returns {number} - Returns 1 if a new field is created, 0 otherwise.
     */
    hset(key, field, value) {
        if (!this.store.has(key)) {
            this.storeSet(key, new XMap());
        }
        const hashMap = this.store.get(key);
        const isNewField = !hashMap.has(field);

        hashMap.set(field, value);
        return isNewField ? 1 : 0;
    }

    /**
     * Delete one or more fields from a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {...string} fields - The fields to delete.
     * @returns {number} - The number of fields removed from the hash.
     */
    hdel(key, ...fields) {
        const hashMap = this.store.get(key);
        if (!hashMap) return 0;

        let removed = 0;
        for (const field of fields) {
            if (hashMap.delete(field)) {
                removed++;
            }
        }
        return removed;
    }

    /**
     * Get the value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to get the value for.
     * @returns {*} - The value of the field, or undefined if the field does not exist.
     */
    hget(key, field) {
        const hashMap = this.store.get(key);
        return hashMap ? hashMap.get(field) : undefined;
    }

    /**
     * Get all fields and their values in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @returns {Object} - An object containing field-value pairs,
     *                     or an empty object if the hash does not exist.
     */
    hgetall(key) {
        const hashMap = this.store.get(key);
        if (!hashMap) return {};

        const result = {};
        for (const [field, value] of hashMap) {
            result[field] = value;
        }
        return result;
    }

    /**
     * Increment the integer value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to increment.
     * @param {number} increment - The value to increment by.
     * @returns {number} - The new value of the field after the increment.
     */
    hincrby(key, field, increment) {
        const hashMap = this.store.get(key) || new XMap();
        const currentValue = parseInt(hashMap.get(field) || 0, 10);
        const newValue = currentValue + increment;

        hashMap.set(field, newValue.toString());
        this.storeSet(key, hashMap);
        return newValue;
    }

    /**
     * Increment the float value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to increment.
     * @param {number} increment - The value to increment by.
     * @returns {number} - The new value of the field after the increment.
     */
    hincrbyfloat(key, field, increment) {
        const hashMap = this.store.get(key) || new XMap();
        const currentValue = parseFloat(hashMap.get(field) || 0);
        const newValue = currentValue + increment;

        hashMap.set(field, newValue.toString());
        this.storeSet(key, hashMap);
        return newValue;
    }

    /**
     * Get all field names in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @returns {Array} - An array of field names, or an empty array if the hash does not exist.
     */
    hkeys(key) {
        const hashMap = this.store.get(key);
        return hashMap ? Array.from(hashMap.keys()) : [];
    }

    /**
     * Get the number of fields in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @returns {number} - The number of fields in the hash, or 0 if the hash does not exist.
     */
    hlen(key) {
        const hashMap = this.store.get(key);
        return hashMap ? hashMap.size : 0;
    }

    /**
     * Get the values of multiple fields in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {...string} fields - The fields to get the values for.
     * @returns {Array} - An array of field values.
     */
    hmget(key, ...fields) {
        const hashMap = this.store.get(key) || new XMap();
        return fields.map(field => hashMap.get(field));
    }

    /**
     * Set the values of multiple fields in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {...*} fieldValuePairs - An array of field-value pairs.
     * @returns {string} - Returns "OK" on successful update.
     */
    hmset(key, ...fieldValuePairs) {
        const hashMap = this.store.get(key) || new XMap();

        for (let i = 0; i < fieldValuePairs.length; i += 2) {
            const field = fieldValuePairs[i];
            const value = fieldValuePairs[i + 1];
            hashMap.set(field, value);
        }

        this.storeSet(key, hashMap);
        return true;
    }

    /**
     * Set the value of a field in a hash stored at the given key, only if the field does not exist.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to set the value for.
     * @param {*} value - The value to set.
     * @returns {number} - Returns 1 if the field is newly created, 0 otherwise.
     */
    hsetnx(key, field, value) {
        const hashMap = this.store.get(key) || new XMap();

        if (hashMap.has(field)) {
            return 0;
        }

        hashMap.set(field, value);
        this.storeSet(key, hashMap);
        return 1;
    }

    /**
     * Get the length of the string value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to get the value length for.
     * @returns {number} - The length of the field value, or 0 if the field does not exist.
     */
    hstrlen(key, field) {
        const hashMap = this.store.get(key);
        const value = hashMap ? hashMap.get(field) : null;
        return value ? value.length : 0;
    }

    /**
     * Get all values in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @returns {Array} - An array of field values, or an empty array if the hash does not exist.
     */
    hvals(key) {
        const hashMap = this.store.get(key);
        return hashMap ? Array.from(hashMap.values()) : [];
    }

    /**
     * Incrementally iterate over a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {number} cursor - The starting position for the iteration.
     * @param {string} match - The pattern to filter field names (default is "*").
     * @param {number} count - The maximum number of elements to return (default is 10).
     * @returns {Array} - An array containing the next cursor and the filtered field-value pairs.
     */
    hscan(key, cursor, match = '*', count = 10) {
        const hashMap = this.store.get(key) || new XMap();
        const filteredFields = Array.from(hashMap.keys()).filter(field => field.includes(match));
        const endIndex = Math.min(cursor + count, filteredFields.length);
        const nextCursor = endIndex === filteredFields.length ? 0 : endIndex;

        return [nextCursor, filteredFields.slice(cursor, endIndex).map(field => [field, hashMap.get(field)])];
    }

    /**
     * Check if a field exists in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to check for existence.
     * @returns {number} - Returns 1 if the field exists, 0 otherwise.
     */
    hexists(key, field) {
        const hashMap = this.store.get(key);
        return hashMap && hashMap.has(field) ? 1 : 0;
    }

    /**
     * Get random field(s) from a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {number} count - The number of random fields to return (default is 1).
     * @returns {Array} - An array of random field names, or an empty array if the hash does not exist.
     */
    hrandfield(key, count = 1) {
        const hashMap = this.store.get(key);
        if (!hashMap) return [];

        const fields = Array.from(hashMap.keys());
        const result = [];

        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * fields.length);
            result.push(fields[randomIndex]);
        }

        return result;
    }

    /**
     * Checks if a key has expired and removes it if it has.
     * @param {*} key - The key to check for expiration.
     * @returns {boolean} - Returns true if the key was expired and removed, false otherwise.
     */
    _checkAndRemoveExpiredKey(key) {
        const expireTime = this.expireTimes.get(key);
        if (expireTime && Date.now() > expireTime) {
            this.store.delete(key);
            this.expireTimes.delete(key);
            // Remove from IndexedDB if available
            if (this.isIndexedDBAvailable && this.db) {
                this._removeFromIndexedDB(key);
            }
            return true;
        }
        return false;
    }

    /**
     * Initializes a cleanup loop that runs at a specified interval and removes expired keys from the store.
     * @param {number} cleanupIntervalMs - The interval, in milliseconds, at which the cleanup loop should run.
     */
    _initCleanupLoop(cleanupIntervalMs) {
        // create new cleanup loop
        if (this.store.size === 1) {
            this.cleanupLoop = setInterval(() => {
                if (this.store.size === 0 && this.cleanupLoop) {
                    clearInterval(this.cleanupLoop);
                } else {
                    for (const key of this.expireTimes.keys()) {
                        this._checkAndRemoveExpiredKey(key);
                    }
                }
            }, cleanupIntervalMs);
            
            // Only call unref() if it exists (Node.js environment)
            // In browsers, setInterval returns a number, not an object with unref()
            if (typeof this.cleanupLoop === 'object' && typeof this.cleanupLoop.unref === 'function') {
                this.cleanupLoop.unref();
            }
        }
    }

    /**
     * Calculates the haversine distance between two geographic coordinates.
     * @param {number} lat1 - The latitude of the first coordinate.
     * @param {number} lon1 - The longitude of the first coordinate.
     * @param {number} lat2 - The latitude of the second coordinate.
     * @param {number} lon2 - The longitude of the second coordinate.
     * @returns {number} - The haversine distance in meters.
     */
    _haversineDistance(lat1, lon1, lat2, lon2) {
        const toRadians = (angle) => (angle * Math.PI) / 180;
        const R = 6371e3; // Earth's radius in meters

        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Converts a distance value from one unit to another.
     * @param {number} distance - The distance value to convert.
     * @param {string} fromUnit - The unit of the given distance (m, km, mi, ft).
     * @param {string} toUnit - The target unit to convert the distance to (m, km, mi, ft).
     * @returns {number} - The distance value converted to the target unit.
     */
    _convertDistance(distance, fromUnit, toUnit) {
        const conversionFactors = {
            m: 1,
            km: 0.001,
            mi: 0.000621371,
            ft: 3.28084,
        };

        if (!conversionFactors[fromUnit] || !conversionFactors[toUnit]) {
            throw new Error('Invalid distance unit');
        }

        return (distance * conversionFactors[fromUnit]) / conversionFactors[toUnit];
    }

    /**
     * Encodes a geographic coordinate (latitude, longitude) into a geohash string.
     * @param {number} latitude - The latitude of the coordinate.
     * @param {number} longitude - The longitude of the coordinate.
     * @returns {string} - The geohash string.
     */
    _encodeGeohash(latitude, longitude) {
        const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
        let hash = '';

        let minLat = -90;
        let maxLat = 90;
        let minLon = -180;
        let maxLon = 180;

        let even = true;
        let bit = 0;
        let charIndex = 0;

        while (hash.length < 12) {
            if (even) {
                const midLon = (minLon + maxLon) / 2;
                if (longitude > midLon) {
                    charIndex = (charIndex << 1) + 1;
                    minLon = midLon;
                } else {
                    charIndex = charIndex << 1;
                    maxLon = midLon;
                }
            } else {
                const midLat = (minLat + maxLat) / 2;
                if (latitude > midLat) {
                    charIndex = (charIndex << 1) + 1;
                    minLat = midLat;
                } else {
                    charIndex = charIndex << 1;
                    maxLat = midLat;
                }
            }

            even = !even;

            if (bit < 4) {
                bit++;
            } else {
                hash += base32[charIndex];
                bit = 0;
                charIndex = 0;
            }
        }

        return hash;
    }

    /**
     * Removes all keys and associated values from the store and clears all expiration times
     * @returns {boolean} - Returns true if the function was successful.
     */
    flushall() {
        // Clear all keys and associated values from the store
        this.store.clear();

        // Clear all expiration times from the expirations map
        this.expireTimes.clear();

        // Clear IndexedDB if available
        if (this.isIndexedDBAvailable && this.db) {
            this._clearIndexedDB();
        }

        // Return true to indicate that the function was successful
        return true;
    }

    /**
     * Clear all data from IndexedDB
     * @private
     */
    async _clearIndexedDB() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['store', 'expireTimes'], 'readwrite');
            const storeObjectStore = transaction.objectStore('store');
            const expireTimesObjectStore = transaction.objectStore('expireTimes');
            
            storeObjectStore.clear();
            expireTimesObjectStore.clear();
        } catch (error) {
            console.warn('Failed to clear IndexedDB:', error);
        }
    }
}

module.exports = kvjs;
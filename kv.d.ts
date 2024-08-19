export = kvjs;
declare class kvjs {
    store: Map<any, any>;
    expireTimes: Map<any, any>;
    storeSet: (key: any, value: any) => void;
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
    set(key: any, value: any, options?: any): boolean | undefined;
    /**
     * Get the value of a key.
     * @param {*} key - The key to get.
     * @returns {*} - The value of the key, or `undefined` if the key does not exist or has expired.
     */
    get(key: any): any;
    /**
     * Delete specified key(s). If a key does not exist, it is ignored.
     * @param {*} key - The key to delete.
     * @returns {number} - 1 if the key was deleted, 0 if the key did not exist or has expired.
     */
    del(...keys: any[]): number;
    /**
     * Check if one or more keys exist.
     * @param {...string} keys - The keys to check.
     * @returns {number} - The number of keys that exist.
     */
    exists(...keys: string[]): number;
    /**
     * Increment the value of a key by 1.
     * @param {*} key - The key to increment.
     * @returns {number} - The new value of the key.
     */
    incr(key: any): number;
    /**
     * Increment the value of a key by a given amount.
     * @param {*} key - The key to increment.
     * @param {number} increment - The amount to increment the key by.
     * @returns {number} - The new value of the key.
     * @throws {Error} - If the value of the key is not an integer.
     */
    incrby(key: any, increment: number): number;
    /**
     * Decrement the value of a key by 1.
     * @param {*} key - The key to decrement.
     * @returns {number} - The new value of the key.
     * @throws {Error} - If the value is not an integer.
     */
    decr(key: any): number;
    /**
     * Decrement the value of a key by a given amount.
     * @param {*} key - The key to decrement.
     * @param {number} decrement - The amount to decrement the key by.
     * @returns {number} - The new value of the key.
     * @throws {Error} - If the value is not an integer.
     */
    decrby(key: any, decrement: number): number;
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
    expire(key: any, seconds: number, options?: any): number;
    /**
     * Find all keys matching the specified pattern.
     * @param {string} pattern - The pattern to match keys against. Supports glob-style patterns.
     * @returns {Array} - An array of keys that match the specified pattern.
     */
    keys(pattern: string): any[];
    /**
     * Returns an array of values stored at the given keys. If a key is not found, undefined is returned for that key.
     * @param {...string} keys - The keys to retrieve.
     * @returns {Array} - An array of values.
     */
    mget(...keys: string[]): any[];
    /**
     * Set multiple keys to their respective values.
     * @param  {...any} keyValuePairs - The keys and values to set, given as alternating arguments.
     * @returns {boolean} - A boolean indicating that the operation was successful.
     * @throws {Error} - If the number of arguments is odd.
     */
    mset(...keyValuePairs: any[]): boolean;
    /**
     * Renames a key to a new key only if the new key does not exist.
     * @param {string} oldKey - The old key name.
     * @param {string} newKey - The new key name.
     * @returns {number} - 1 if the key was successfully renamed, 0 otherwise.
     */
    renamenx(oldKey: string, newKey: string): number;
    /**
     * Return a random key from the cache.
     * @returns {(string|undefined)} - A random key from the cache or undefined if the cache is empty.
     */
    randomkey(): (string | undefined);
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
    expireat(key: any, timestampSeconds: number, options?: any): number;
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
    pexpire(key: any, ttlMillis: number, options?: any): number;
    /**
     * Sets the expiration timestamp for the key in milliseconds.
     * @param {*} key - The key to set the expiration timestamp for.
     * @param {number} timestampMillis - The expiration timestamp in milliseconds.
     * @returns {number} - 1 if the timeout was set, 0 if the key does not exist or the timeout could not be set.
     */
    pexpireat(key: any, timestampMillis: number): number;
    /**
     * Returns the remaining time to live of a key that has an expiration set, in milliseconds.
     * If the key does not exist or does not have an associated expiration time, it returns -2 or -1, respectively.
     *
     * @param {*} key - The key to check.
     * @returns {number} - The remaining time to live in milliseconds. If the key does not exist or has no expiration, returns -2 or -1 respectively.
     */
    pttl(key: any): number;
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
    ttl(key: any): number;
    /**
     * Remove the expiration from a key.
     * @param {*} key - The key to remove expiration from.
     * @returns {number} - 1 if the expiration was removed, 0 otherwise.
     */
    persist(key: any): number;
    /**
     * Get a substring of the string stored at a key.
     * @param {*} key - The key to get the substring from.
     * @param {number} start - The starting index of the substring (0-based).
     * @param {number} end - The ending index of the substring (0-based, inclusive).
     * @returns {string} - The substring, or an empty string if the key does not exist or is not a string.
     */
    getrange(key: any, start: number, end: number): string;
    /**
     * Replaces the current value of a key with the specified new value and returns the old value.
     * If the key does not exist, it is created and set to the specified value.
     * @param {*} key - The key to update.
     * @param {*} value - The new value to set.
     * @returns {string|undefined} - The old value of the key, or undefined if the key did not exist.
     */
    getset(key: any, value: any): string | undefined;
    /**
     * Set the value of a key with an expiration time in milliseconds.
     * If the key already exists, it will be overwritten with the new value.
     * @param {*} key - The key to set.
     * @param {*} value - The value to set for the key.
     * @param {number} ttl - The time-to-live for the key, in milliseconds.
     * @returns {boolean|undefined} - true if the key was set successfully.
     */
    setex(key: any, value: any, ttl: number): boolean | undefined;
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
    setrange(key: any, offset: number, value: any): number;
    /**
     * Get the length of the value stored at a key.
     * @param {*} key - The key to get the length of.
     * @returns {number} - The length of the value stored at the key, or 0 if the key does not exist.
     */
    strlen(key: any): number;
    /**
     * Set the values of multiple keys.
     * @param {*} keyValuePairs - The key-value pairs to set.
     * @param {*} value - The value to set for the key.
     * @returns {number} - 1 if the key was set, 0 if the key was not set.
     * @throws {Error} - If an error occurs while executing the command.
     */
    msetnx(...keyValuePairs: any): number;
    /**
     * Increment the value of a key by a floating-point number.
     * @param {*} key - The key to increment.
     * @param {number} increment - The value to increment by.
     * @returns {number} - The new value of the key.
     * @throws {Error} - If the value is not a valid float.
     */
    incrbyfloat(key: any, increment: number): number;
    /**
     * If the key already exists, the value is appended to the end of the existing value.
     * If the key doesn't exist, a new key is created and set to the value.
     * @param {*} key - The key to append the value to.
     * @param {*} value - The value to append.
     * @returns {number} - The length of the new string.
     */
    append(key: any, value: any): number;
    /**
     * Returns the bit value at a given offset in the string value of a key.
     * @param {*} key - The key to get the bit from.
     * @param {number} offset - The bit offset.
     * @returns {number} - 1 or 0, the bit value at the given offset. If the key does not exist or the offset is out of range, 0 is returned.
     */
    getbit(key: any, offset: number): number;
    /**
     * Sets or clears the bit at offset in the string value stored at key.
     * @param {*} key - The key to set the bit on.
     * @param {number} offset - The bit offset.
     * @param {number} bit - The bit value to set.
     * @returns {number} - The original bit value stored at offset.
     */
    setbit(key: any, offset: number, bit: number): number;
    /**
     * Copies the value stored at a key to another key.
     * @param {*} source - The key to copy from.
     * @param {*} destination - The key to copy to.
     * @returns {number} - 1 if the key was copied, 0 if the key was not copied.
     */
    copy(source: any, destination: any): number;
    /**
     * Renames a key.
     * @param {*} key - The key to rename.
     * @param {*} newKey - The new key name.
     * @returns {boolean} - true if the key was renamed, an error if the key was not renamed.
     */
    rename(key: any, newKey: any): boolean;
    /**
     * Returns the type of the value stored at a key.
     * @param {*} key - The key to get the type of.
     * @returns {string} - The type of the value stored at the key.
     */
    type(key: any): string;
    /**
     * Add members to a set stored at key.
     * @param {*} key - The key to add the members to.
     * @param {*} members - The members to add to the set.
     * @returns {number} - The number of members that were added to the set, not including all the members that were already present in the set.
     */
    sadd(key: any, ...members: any): number;
    /**
     * Returns the number of members of the set stored at key.
     * @param {*} key - The key to get the size of.
     * @returns {number} - The number of members in the set.
     */
    scard(key: any): number;
    /**
     * This method retrieves the members of a set that are present in the first set but not in any of the subsequent sets, and returns them as a new set.
     * @param {*} key1 - The first key to compare.
     * @param {*} otherKeys - The other keys to compare.
     * @returns {Array} - An array of members.
     */
    sdiff(key1: any, ...otherKeys: any): any[];
    /**
     * The functionality of this method is similar to that of sdiff, except that instead of returning the resulting set, it stores the set in the destination provided as an argument.
     * @param {*} destination - The key to store the resulting set in.
     * @param {*} key1 - The first key to compare.
     * @param {*} otherKeys - The other keys to compare.
     * @returns {number} - The number of elements in the resulting set.
     */
    sdiffstore(destination: any, key1: any, ...otherKeys: any): number;
    /**
     * This method retrieves the members that are present in all the sets provided as arguments, and returns them as a new set representing the intersection of those sets.
     * @param {*} keys - The keys to intersect.
     * @returns {Array} - An array of members.
     */
    sinter(...keys: any): any[];
    /**
     * Returns the number of elements in the intersection of one or more sets.
     * @param {...string} keys - The keys of the sets to intersect.
     * @returns {number} - The cardinality (number of elements) in the intersection of the sets.
     */
    sintercard(...keys: string[]): number;
    /**
     * Computes the intersection of one or more sets and stores the result in a new set.
     * @param {string} destination - The key of the new set to store the result in.
     * @param {...string} keys - The keys of the sets to intersect.
     * @returns {number} - The cardinality (number of elements) in the intersection of the sets.
     */
    sinterstore(destination: string, ...keys: string[]): number;
    /**
     * This method determines if a given value is a member of the set stored at key.
     * @param {*} key - The key to check.
     * @param {*} member - The member to check for.
     * @returns {number} - 1 if the member is a member of the set stored at key. 0 if the member is not a member of the set, or if key does not exist.
     */
    sismember(key: any, member: any): number;
    /**
     * This method retrieves all the members of the set value stored at key.
     * @param {*} key - The key to get the members of.
     * @returns {Array} - An array of members.
     */
    smembers(key: any): any[];
    /**
     * Determines whether each member is a member of the set stored at key.
     * @param {*} key - The key to check.
     * @param {*} members - The members to check for.
     * @returns {Array} - An array of 1s and 0s.
     */
    smismember(key: any, ...members: any): any[];
    /**
     * Moves a member from one set to another.
     * @param {*} source - The key of the set to move the member from.
     * @param {*} destination - The key of the set to move the member to.
     * @param {*} member - The member to move.
     * @returns {number} - 1 if the member was moved. 0 if the member was not moved.
     */
    smove(source: any, destination: any, member: any): number;
    /**
     * Removes and returns one or multiple random members from a set.
     * @param {*} key - The key of the set.
     * @param {number} [count=1] - The number of random members to return.
     * @returns {Array} An array of random members or an empty array if the set is empty or does not exist.
     */
    spop(key: any, count?: number): any[];
    /**
     * Get one or multiple random members from a set without removing them.
     * @param {*} key - The key of the set.
     * @param {number} [count=1] - The number of random members to return.
     * @returns {Array} An array of random members or an empty array if the set is empty or does not exist.
     */
    srandmember(key: any, count?: number): any[];
    /**
     * Remove one or more members from a set.
     * @param {*} key - The key of the set.
     * @param {...string} members - The members to remove from the set.
     * @returns {number} The number of members removed from the set.
     */
    srem(key: any, ...members: string[]): number;
    /**
     * Iterates the set elements using a cursor.
     * @param {*} key - The key of the set.
     * @param {number} cursor - The cursor to start the iteration from.
     * @param {Object} [options] - The optional configuration object.
     * @param {string} [options.match] - A pattern to match the returned elements.
     * @param {number} [options.count] - The number of elements to return in each iteration.
     * @returns {[number, Array]} An array containing the next cursor and an array of elements.
     */
    sscan(key: any, cursor: number, options?: {
        match?: string;
        count?: number;
    }): [number, any[]];
    /**
     * Computes the union of the sets stored at the specified keys.
     * @param {...string} keys - The keys of the sets to compute the union for.
     * @returns {Array} An array containing the members of the union or an empty array if no sets exist.
     */
    sunion(...keys: string[]): any[];
    /**
     * Computes the union of the sets stored at the specified keys and stores the result in a new set at the destination key.
     * @param {string} destination - The key to store the resulting set.
     * @param {...string} keys - The keys of the sets to compute the union for.
     * @returns {number} The number of members in the resulting set.
     */
    sunionstore(destination: string, ...keys: string[]): number;
    /**
     * Sets the value of an element in a list by its index.
     * @param {*} key - The key of the list.
     * @param {number} index - The index of the element to set the value for.
     * @param {*} value - The value to set.
     * @returns {string} "OK" if the value is successfully set or an error if the index is out of range.
     */
    lset(key: any, index: number, value: any): string;
    /**
     * Trims a list to the specified range.
     * @param {*} key - The key of the list.
     * @param {number} start - The start index of the range to trim.
     * @param {number} stop - The end index of the range to trim.
     * @returns {string} "OK" if the list is successfully trimmed or an error if the key holds a wrong kind of value.
     */
    ltrim(key: any, start: number, stop: number): string;
    /**
     * Removes and returns the last element of the list stored at the specified key.
     * @param {*} key - The key of the list.
     * @returns {*} The last element of the list or null if the key does not exist.
     */
    rpop(key: any): any;
    /**
     * Removes the last element of the list stored at the specified key and pushes it to the list stored at the destination key.
     * @param {*} source - The key of the list to pop the element from.
     * @param {*} destination - The key of the list to push the element to.
     * @returns {*} The last element of the list or null if the key does not exist.
     */
    rpoplpush(source: any, destination: any): any;
    /**
     * Adds values to the end of the list stored at the specified key.
     * @param {*} key - The key of the list.
     * @param {...*} values - The values to add to the list.
     * @returns {number} The length of the list after the push operation.
     */
    rpush(key: any, ...values: any[]): number;
    /**
     * Adds values to the end of the list stored at the specified key if the key exists and stores a list.
     * @param {*} key - The key of the list.
     * @param {*} value - The value to add to the list.
     * @returns {number} The length of the list after the push operation.
     */
    rpushx(key: any, value: any): number;
    /**
     * Adds values to the beginning of the list stored at the specified key.
     * @param {*} key - The key of the list.
     * @param {...*} values - The values to add to the list.
     * @returns {number} The length of the list after the push operation.
     */
    lpush(key: any, ...values: any[]): number;
    /**
     * Adds values to the beginning of the list stored at the specified key if the key exists and stores a list.
     * @param {*} key - The key of the list.
     * @param {*} value - The value to add to the list.
     * @returns {number} The length of the list after the push operation.
     */
    lpushx(key: any, ...values: any[]): number;
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
    lrange(key: any, start: number, stop: number): any[];
    /**
     * Remove elements with the given value from a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @param {number} count - The number of occurrences to remove.
     * @param {*} value - The value of the elements to remove.
     * @returns {number} - The number of removed elements.
     */
    lrem(key: any, count: number, value: any): number;
    /**
     * Pop an element from a list stored at the source key and push it to a list stored at the destination key.
     *
     * @param {string} source - The key where the source list is stored.
     * @param {string} destination - The key where the destination list is stored.
     * @param {string} srcDirection - The direction to pop from the source list ('LEFT' or 'RIGHT').
     * @param {string} destDirection - The direction to push to the destination list ('LEFT' or 'RIGHT').
     * @returns {*} - The element moved or null if the source list is empty.
     */
    lmove(source: string, destination: string, srcDirection: string, destDirection: string): any;
    /**
     * Pop multiple elements from a list stored at the given key in the specified direction.
     *
     * @param {number} count - The number of elements to pop.
     * @param {*} key - The key where the list is stored.
     * @param {string} direction - The direction to pop from the list ('LEFT' or 'RIGHT').
     * @returns {Array} - An array of popped elements.
     */
    lmpop(count: number, key: any, direction: string): any[];
    /**
     * Pop an element from the left end of a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @returns {*} - The popped element or null if the list is empty.
     */
    lpop(key: any): any;
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
    lpos(key: any, element: any, options?: {
        rank: number;
        start: number;
        stop: number;
    }): number | undefined;
    /**
     * Pop an element from the right end of a list stored at the source key and push it to the left end of a list stored at the destination key.
     *
     * @param {string} source - The key where the source list is stored.
     * @param {string} destination - The key where the destination list is stored.
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @returns {*} - The element moved or null if the source list is empty.
     */
    brpoplpush(source: string, destination: string, timeout: number): any;
    /**
     * Get the element at the specified index in a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @param {number} index - The index of the element to retrieve.
     * @returns {*} - The element at the specified index or null if the index is out of range.
     */
    lindex(key: any, index: number): any;
    /**
     * Insert an element before or after a pivot element in a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @param {string} position - The position to insert the new element ('BEFORE' or 'AFTER').
     * @param {*} pivot - The pivot element to insert the new element before or after.
     * @param {*} value - The value of the new element to insert.
     * @returns {number} - The length of the list after the insert operation.
     */
    linsert(key: any, position: string, pivot: any, value: any): number;
    /**
     * Get the length of a list stored at the given key.
     *
     * @param {*} key - The key where the list is stored.
     * @returns {number} - The length of the list.
     */
    llen(key: any): number;
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
    blmove(source: string, destination: string, srcDirection: string, destDirection: string, timeout: number): any;
    /**
     * Pop multiple elements from a list stored at the given keys in a blocking manner, waiting until at least one element is available or the timeout expires.
     *
     * @param {number} count - The number of elements to pop.
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @param {...string} keys - The keys where the lists are stored.
     * @returns {Array} - An array of popped elements.
     */
    blmpop(count: number, timeout: number, ...keys: string[]): any[];
    /**
     * Pop an element from the left end of a list stored at the given keys in a blocking manner, waiting until an element is available or the timeout expires.
     *
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @param {...string} keys - The keys where the lists are stored.
     * @returns {Array|null} - An array containing the key and the popped element, or null if no element is available or the timeout expires.
     */
    blpop(timeout: number, ...keys: string[]): any[] | null;
    /**
     * Pop an element from the right end of a list stored at the given keys in a blocking manner, waiting until an element is available or the timeout expires.
     *
     * @param {number} timeout - The maximum number of seconds to block waiting for an element to pop.
     * @param {...string} keys - The keys where the lists are stored.
     * @returns {Array|null} - An array containing the key and the popped element, or null if no element is available or the timeout expires.
     */
    brpop(timeout: number, ...keys: string[]): any[] | null;
    /**
     * Get the expire time of a key in seconds.
     *
     * @param {*} key - The key to get the expire time for.
     * @returns {number|undefined} - The expire time in seconds, or undefined if the key has no expire time.
     */
    expiretime(key: any): number | undefined;
    /**
     * Get the expire time of a key in milliseconds.
     *
     * @param {*} key - The key to get the expire time for.
     * @returns {number|undefined} - The expire time in milliseconds, or undefined if the key has no expire time.
     */
    pexpiretime(key: any): number | undefined;
    /**
     * Add a member with the specified score to a sorted set stored at the given key.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} score - The score associated with the member.
     * @param {*} member - The member to add to the sorted set.
     * @returns {number} - The number of elements added to the sorted set (0 or 1).
     */
    zadd(key: any, score: number, member: any): number;
    /**
     * Get the number of members in a sorted set stored at the given key.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @returns {number} - The number of members in the sorted set.
     */
    zcard(key: any): number;
    /**
     * Count the number of members in a sorted set stored at the given key with a score between min and max (inclusive).
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} min - The minimum score.
     * @param {number} max - The maximum score.
     * @returns {number} - The number of members with a score between min and max.
     */
    zcount(key: any, min: number, max: number): number;
    /**
     * Compute the difference between the members of the given sorted sets stored at the specified keys.
     *
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {Set} - A set containing the members present in the first sorted set but not in the others.
     */
    zdiff(...keys: string[]): Set<any>;
    /**
     * Compute the difference between the given sorted sets stored at the specified keys and store the result in the destination key.
     *
     * @param {string} destination - The key where the result will be stored.
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {number} - The number of members in the resulting sorted set.
     */
    zdiffstore(destination: string, ...keys: string[]): number;
    /**
     * Blockingly pop members with the lowest scores from multiple sorted sets.
     *
     * @param {number} count - The number of members to pop.
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {Array} - An array containing the key and the popped members with their scores.
     */
    bzmpop(count: number, ...keys: string[]): any[];
    /**
     * Pop the specified number of members with the highest scores from a sorted set.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} count - The number of members to pop.
     * @returns {Array} - An array containing the key and the popped members with their scores.
     */
    bzpopmax(key: any, count: number): any[];
    /**
     * Pop the specified number of members with the lowest scores from a sorted set.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} count - The number of members to pop.
     * @returns {Array} - An array containing the key and the popped members with their scores.
     */
    bzpopmin(key: any, count: number): any[];
    /**
     * Increment the score of a member in a sorted set by the specified increment value.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} increment - The value to increment the score by.
     * @param {*} member - The member whose score to increment.
     * @returns {number} - The new score of the member.
     */
    zincrby(key: any, increment: number, member: any): number;
    /**
     * Compute the intersection between the members of the given sorted sets stored at the specified keys.
     *
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {Set} - A set containing the members present in all the sorted sets.
     */
    zinter(...keys: string[]): Set<any>;
    /**
     * Get the number of members in the intersection between the given sorted sets stored at the specified keys.
     *
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {number} - The number of members in the intersection.
     */
    zintercard(...keys: string[]): number;
    /**
     * Compute the intersection between the given sorted sets stored at the specified keys and store the result in the destination key.
     *
     * @param {string} destination - The key where the result will be stored.
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {number} - The number of members in the resulting sorted set.
     */
    zinterstore(destination: string, ...keys: string[]): number;
    /**
     * Count the number of members in a sorted set stored at the given key with scores between the given min and max values.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {*} min - The minimum score.
     * @param {*} max - The maximum score.
     * @returns {number} - The number of members with scores between min and max.
     */
    zlexcount(key: any, min: any, max: any): number;
    /**
     * Pop the specified number of members with the lowest scores from the given sorted sets.
     *
     * @param {number} count - The number of members to pop.
     * @param {...string} keys - The keys where the sorted sets are stored.
     * @returns {Array} - An array containing the key and the popped members with their scores.
     */
    zmpop(count: number, ...keys: string[]): any[];
    /**
     * Get the scores of the specified members in a sorted set stored at the given key.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {...*} members - The members whose scores to retrieve.
     * @returns {Array} - An array containing the scores of the specified members.
     */
    zmscore(key: any, ...members: any[]): any[];
    /**
     * Pop the specified number of members with the highest scores from a sorted set.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} count - The number of members to pop.
     * @returns {Array} - An array containing the popped members with their scores.
     */
    zpopmax(key: any, count: number): any[];
    /**
     * Pop the specified number of members with the lowest scores from a sorted set.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} count - The number of members to pop.
     * @returns {Array} - An array containing the popped members with their scores.
     */
    zpopmin(key: any, count: number): any[];
    /**
     * Get the specified number of random members from a sorted set stored at the given key.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} [count=1] - The number of random members to retrieve.
     * @returns {Array} - An array containing the randomly chosen members.
     */
    zrandmember(key: any, count?: number): any[];
    /**
     * Get the members in a sorted set stored at the given key with their scores between the specified start and stop indices.
     *
     * @param {*} key - The key where the sorted set is stored.
     * @param {number} start - The start index.
     * @param {number} stop - The stop index.
     * @returns {Array} - An array containing the members and their scores within the specified range.
     */
    zrange(key: any, start: number, stop: number): any[];
    /**
     * Returns all elements in the sorted set stored at the key with a value between min and max (inclusive) in lexicographical order.
     * @param {*} key - The key of the sorted set.
     * @param {string} min - The minimum member value.
     * @param {string} max - The maximum member value.
     * @param {Object} [options={}] - Additional options (e.g., { limit: { offset, count } }).
     * @returns {string[]} - The filtered and sorted set members.
     */
    zrangebylex(key: any, min: string, max: string, options?: any): string[];
    /**
     * Returns all elements in the sorted set stored at the key with a score between min and max (inclusive).
     * @param {*} key - The key of the sorted set.
     * @param {number} min - The minimum score value.
     * @param {number} max - The maximum score value.
     * @param {Object} [options={}] - Additional options (e.g., { withscores: true, limit: { offset, count } }).
     * @returns {(string[]|Array[])} - The filtered and sorted set members, with or without scores based on options.
     */
    zrangebyscore(key: any, min: number, max: number, options?: any): (string[] | any[][]);
    /**
     * Copies a range of elements from a sorted set to another sorted set.
     * @param {string} destination - The destination key for the new sorted set.
     * @param {*} key - The key of the source sorted set.
     * @param {number} start - The starting index.
     * @param {number} stop - The ending index.
     * @returns {number} - The number of elements in the new sorted set.
     */
    zrangestore(destination: string, key: any, start: number, stop: number): number;
    /**
     * Determines the index of a member in the sorted set stored at the key.
     * @param {*} key - The key of the sorted set.
     * @param {string} member - The member to find the index of.
     * @returns {(number|undefined)} - The index of the member, or undefined if not found.
     */
    zrank(key: any, member: string): (number | undefined);
    /**
     * Removes one or more members from the sorted set stored at the key.
     * @param {*} key - The key of the sorted set.
     * @param {...string} members - The members to remove from the sorted set.
     * @returns {number} - The number of members removed.
     */
    zrem(key: any, ...members: string[]): number;
    /**
     * Removes all elements in the sorted set stored at the key with a value between min and max (inclusive) in lexicographical order.
     * @param {*} key - The key of the sorted set.
     * @param {string} min - The minimum member value.
     * @param {string} max - The maximum member value.
     * @returns {number} - The number of members removed.
     */
    zremrangebylex(key: any, min: string, max: string): number;
    /**
     * Removes all elements in the sorted set stored at key with rank between start and stop.
     * @param {string} key - The key of the sorted set.
     * @param {number} start - The start rank.
     * @param {number} stop - The stop rank.
     * @returns {number} - The number of elements removed.
     */
    zremrangebyrank(key: string, start: number, stop: number): number;
    /**
     * Removes all elements in the sorted set stored at key with a score between min and max (inclusive).
     * @param {string} key - The key of the sorted set.
     * @param {number} min - The minimum score.
     * @param {number} max - The maximum score.
     * @returns {number} - The number of elements removed.
     */
    zremrangebyscore(key: string, min: number, max: number): number;
    /**
     * Returns the specified range of elements in the sorted set stored at key in reverse order.
     * @param {string} key - The key of the sorted set.
     * @param {number} start - The start index.
     * @param {number} stop - The stop index.
     * @returns {Array} - The specified range of elements in reverse order.
     */
    zrevrange(key: string, start: number, stop: number): any[];
    /**
     * Returns all elements in the sorted set stored at key with a value between max and min.
     * @param {string} key - The key of the sorted set.
     * @param {*} max - The maximum value.
     * @param {*} min - The minimum value.
     * @param {Object} options - Additional options.
     * @returns {Array} - The specified range of elements.
     */
    zrevrangebylex(key: string, max: any, min: any, options?: any): any[];
    /**
     * Returns all elements in the sorted set stored at key with a score between max and min (inclusive) in reverse order.
     * @param {string} key - The key of the sorted set.
     * @param {number} max - The maximum score.
     * @param {number} min - The minimum score.
     * @param {Object} options - Additional options.
     * @returns {Array} - The specified range of elements in reverse order.
     */
    zrevrangebyscore(key: string, max: number, min: number, options?: any): any[];
    /**
     * Returns the rank of member in the sorted set stored at key, with the scores ordered from high to low.
     * @param {string} key - The key of the sorted set.
     * @param {*} member - The member whose rank to determine.
     * @returns {number|undefined} - The rank of the member, or undefined if the member or sorted set does not exist.
     */
    zrevrank(key: string, member: any): number | undefined;
    /**
     * Incrementally iterates the elements of the sorted set stored at key.
     * @param {string} key - The key of the sorted set.
     * @param {number} cursor - The cursor position.
     * @param {Object} options - Additional options.
     * @returns {Array} - An array containing the next cursor and the result.
     */
    zscan(key: string, cursor: number, options?: any): any[];
    /**
     * Returns the score of a member in the sorted set stored at key.
     * @param {string} key - The key of the sorted set.
     * @param {*} member - The member whose score to retrieve.
     * @returns {number|undefined} - The score of the member, or undefined if the member or sorted set does not exist.
     */
    zscore(key: string, member: any): number | undefined;
    /**
     * Computes the union of multiple sorted sets specified by the keys array.
     * @param {Array<string>} keys - An array of keys identifying the sorted sets to be combined.
     * @returns {Array} - The union of the specified sorted sets, sorted by score.
     */
    zunion(keys: Array<string>): any[];
    /**
     * Computes the union of multiple sorted sets specified by the keys array and stores the result in a new sorted set with the given destination key.
     * @param {string} destination - The key of the new sorted set where the result will be stored.
     * @param {Array<string>} keys - An array of keys identifying the sorted sets to be combined.
     * @returns {number} - The size of the resulting sorted set.
     */
    zunionstore(destination: string, keys: Array<string>): number;
    /**
     * Adds the specified geospatial item to the sorted set stored at key.
     * @param {*} key - The key of the sorted set.
     * @param {number} longitude - The longitude of the geospatial item.
     * @param {number} latitude - The latitude of the geospatial item.
     * @param {string} member - The member to be added to the sorted set.
     * @returns {number} - The number of elements added to the sorted set (0 or 1).
     */
    geoadd(key: any, longitude: number, latitude: number, member: string): number;
    /**
     * Calculates the distance between two geospatial items.
     * @param {*} key - The key of the sorted set.
     * @param {string} member1 - The first member in the sorted set.
     * @param {string} member2 - The second member in the sorted set.
     * @param {string} [unit='m'] - The unit of the returned distance (m, km, mi, ft).
     * @returns {number|undefined} - The distance between the two members or undefined if not found.
     */
    geodist(key: any, member1: string, member2: string, unit?: string): number | undefined;
    /**
     * Returns the geohash string of one or more members.
     * @param {*} key - The key of the sorted set.
     * @param {...string} members - One or more members for which to return the geohash.
     * @returns {string[]} - An array of geohash strings for the requested members.
     */
    geohash(key: any, ...members: string[]): string[];
    /**
     * Returns the positions (latitude, longitude) of one or more members.
     * @param {*} key - The key of the sorted set.
     * @param {...string} members - One or more members for which to return the positions.
     * @returns {Array<[number, number]>} - An array of positions for the requested members.
     */
    geopos(key: any, ...members: string[]): Array<[number, number]>;
    /**
     * Returns members of a sorted set whose positions are within the specified radius from the given point.
     * @param {*} key - The key of the sorted set.
     * @param {number} longitude - The longitude of the center point.
     * @param {number} latitude - The latitude of the center point.
     * @param {number} radius - The search radius.
     * @param {string} [unit='m'] - The unit of the search radius (m, km, mi, ft).
     * @returns {string[]} - An array of members within the specified radius.
     */
    georadius(key: any, longitude: number, latitude: number, radius: number, unit?: string): string[];
    /**
     * Computes the members of a geospatial index within the given radius (read-only version).
     * @param {number} latitude - The latitude of the center point.
     * @param {number} longitude - The longitude of the center point.
     * @param {number} radius - The radius to search within.
     * @param {string} key - The key of the geospatial index.
     * @returns {Array} - An array of members within the specified radius.
     */
    georadius_ro(latitude: number, longitude: number, radius: number, key: string): any[];
    /**
     * Computes the members of a geospatial index within the given radius around a specified member's coordinates.
     * @param {string} key - The key of the geospatial index.
     * @param {*} member - The member around which to search.
     * @param {number} radius - The radius to search within.
     * @returns {Array|undefined} - An array of members within the specified radius or undefined if the member is not found.
     */
    georadiusbymember(key: string, member: any, radius: number): any[] | undefined;
    /**
     * Computes the members of a geospatial index within the given radius around a specified member's coordinates (read-only version).
     * @param {string} key - The key of the geospatial index.
     * @param {*} member - The member around which to search.
     * @param {number} radius - The radius to search within.
     * @returns {Array|undefined} - An array of members within the specified radius or undefined if the member is not found.
     */
    georadiusbymember_ro(key: string, member: any, radius: number): any[] | undefined;
    /**
     * Searches for members within a specified radius around a given point in a geospatial index.
     * @param {string} key - The key of the geospatial index.
     * @param {number} latitude - The latitude of the center point.
     * @param {number} longitude - The longitude of the center point.
     * @param {number} radius - The radius to search within.
     * @returns {Array} - An array of members within the specified radius.
     */
    geosearch(key: string, latitude: number, longitude: number, radius: number): any[];
    /**
     * Searches for members within a specified radius around a given point in a geospatial index and stores the results in a new key.
     * @param {string} destinationKey - The key where the results will be stored.
     * @param {string} key - The key of the geospatial index.
     * @param {number} latitude - The latitude of the center point.
     * @param {number} longitude - The longitude of the center point.
     * @param {number} radius - The radius to search within.
     * @returns {number} - The number of members found within the specified radius.
     */
    geosearchstore(destinationKey: string, key: string, latitude: number, longitude: number, radius: number): number;
    /**
     * Scans keys based on the given cursor, match pattern, and count.
     * @param {number} cursor - The starting index for the scan.
     * @param {string} [match='*'] - The pattern to match keys against.
     * @param {number} [count=10] - The maximum number of keys to return.
     * @returns {[number, string[]]} - An array containing the next cursor and the matched keys.
     */
    scan(cursor: number, match?: string, count?: number): [number, string[]];
    /**
     * Sorts the elements in the list, set, or sorted set stored at the key.
     * @param {*} key - The key to retrieve the list, set, or sorted set.
     * @param {string} [order='ASC'] - The order to sort the elements (ASC or DESC).
     * @param {boolean} [alpha=false] - Whether to sort elements alphabetically or numerically.
     * @returns {Array} - The sorted elements.
     */
    sort(key: any, order?: string, alpha?: boolean): any[];
    /**
     * Alters the last access time of a key(s).
     * @param {...string} keys - The keys to update the access time.
     * @returns {number} - The number of existing keys touched.
     */
    touch(...keys: string[]): number;
    /**
     * Alias for the sort method that sorts elements in a read-only manner.
     * @param {*} key - The key to retrieve the list, set, or sorted set.
     * @param {string} [order='ASC'] - The order to sort the elements (ASC or DESC).
     * @param {boolean} [alpha=false] - Whether to sort elements alphabetically or numerically.
     * @returns {Array} - The sorted elements.
     */
    sort_ro(key: any, order?: string, alpha?: boolean): any[];
    /**
     * Unlinks (deletes) the specified keys.
     * @param {...string} keys - The keys to be removed.
     * @returns {number} - The number of keys removed.
     */
    unlink(...keys: string[]): number;
    /**
     * Set the value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to set the value for.
     * @param {*} value - The value to set.
     * @returns {number} - Returns 1 if a new field is created, 0 otherwise.
     */
    hset(key: any, field: string, value: any): number;
    /**
     * Delete one or more fields from a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {...string} fields - The fields to delete.
     * @returns {number} - The number of fields removed from the hash.
     */
    hdel(key: any, ...fields: string[]): number;
    /**
     * Get the value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to get the value for.
     * @returns {*} - The value of the field, or undefined if the field does not exist.
     */
    hget(key: any, field: string): any;
    /**
     * Get all fields and their values in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @returns {Object} - An object containing field-value pairs,
     *                     or an empty object if the hash does not exist.
     */
    hgetall(key: any): any;
    /**
     * Increment the integer value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to increment.
     * @param {number} increment - The value to increment by.
     * @returns {number} - The new value of the field after the increment.
     */
    hincrby(key: any, field: string, increment: number): number;
    /**
     * Increment the float value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to increment.
     * @param {number} increment - The value to increment by.
     * @returns {number} - The new value of the field after the increment.
     */
    hincrbyfloat(key: any, field: string, increment: number): number;
    /**
     * Get all field names in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @returns {Array} - An array of field names, or an empty array if the hash does not exist.
     */
    hkeys(key: any): any[];
    /**
     * Get the number of fields in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @returns {number} - The number of fields in the hash, or 0 if the hash does not exist.
     */
    hlen(key: any): number;
    /**
     * Get the values of multiple fields in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {...string} fields - The fields to get the values for.
     * @returns {Array} - An array of field values.
     */
    hmget(key: any, ...fields: string[]): any[];
    /**
     * Set the values of multiple fields in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {...*} fieldValuePairs - An array of field-value pairs.
     * @returns {string} - Returns "OK" on successful update.
     */
    hmset(key: any, ...fieldValuePairs: any[]): string;
    /**
     * Set the value of a field in a hash stored at the given key, only if the field does not exist.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to set the value for.
     * @param {*} value - The value to set.
     * @returns {number} - Returns 1 if the field is newly created, 0 otherwise.
     */
    hsetnx(key: any, field: string, value: any): number;
    /**
     * Get the length of the string value of a field in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to get the value length for.
     * @returns {number} - The length of the field value, or 0 if the field does not exist.
     */
    hstrlen(key: any, field: string): number;
    /**
     * Get all values in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @returns {Array} - An array of field values, or an empty array if the hash does not exist.
     */
    hvals(key: any): any[];
    /**
     * Incrementally iterate over a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {number} cursor - The starting position for the iteration.
     * @param {string} match - The pattern to filter field names (default is "*").
     * @param {number} count - The maximum number of elements to return (default is 10).
     * @returns {Array} - An array containing the next cursor and the filtered field-value pairs.
     */
    hscan(key: any, cursor: number, match?: string, count?: number): any[];
    /**
     * Check if a field exists in a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {string} field - The field to check for existence.
     * @returns {number} - Returns 1 if the field exists, 0 otherwise.
     */
    hexists(key: any, field: string): number;
    /**
     * Get random field(s) from a hash stored at the given key.
     *
     * @param {*} key - The key where the hash is stored.
     * @param {number} count - The number of random fields to return (default is 1).
     * @returns {Array} - An array of random field names, or an empty array if the hash does not exist.
     */
    hrandfield(key: any, count?: number): any[];
    /**
     * Checks if a key has expired and removes it if it has.
     * @param {*} key - The key to check for expiration.
     * @returns {boolean} - Returns true if the key was expired and removed, false otherwise.
     */
    _checkAndRemoveExpiredKey(key: any): boolean;
    /**
     * Initializes a cleanup loop that runs at a specified interval and removes expired keys from the store.
     * @param {number} cleanupIntervalMs - The interval, in milliseconds, at which the cleanup loop should run.
     */
    _initCleanupLoop(cleanupIntervalMs: number): void;
    cleanupLoop: number;
    /**
     * Calculates the haversine distance between two geographic coordinates.
     * @param {number} lat1 - The latitude of the first coordinate.
     * @param {number} lon1 - The longitude of the first coordinate.
     * @param {number} lat2 - The latitude of the second coordinate.
     * @param {number} lon2 - The longitude of the second coordinate.
     * @returns {number} - The haversine distance in meters.
     */
    _haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
    /**
     * Converts a distance value from one unit to another.
     * @param {number} distance - The distance value to convert.
     * @param {string} fromUnit - The unit of the given distance (m, km, mi, ft).
     * @param {string} toUnit - The target unit to convert the distance to (m, km, mi, ft).
     * @returns {number} - The distance value converted to the target unit.
     */
    _convertDistance(distance: number, fromUnit: string, toUnit: string): number;
    /**
     * Encodes a geographic coordinate (latitude, longitude) into a geohash string.
     * @param {number} latitude - The latitude of the coordinate.
     * @param {number} longitude - The longitude of the coordinate.
     * @returns {string} - The geohash string.
     */
    _encodeGeohash(latitude: number, longitude: number): string;
    /**
     * Removes all keys and associated values from the store and clears all expiration times
     * @returns {boolean} - Returns true if the function was successful.
     */
    flushall(): boolean;
}

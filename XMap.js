'use strict';

/**
 * Class representing an extended version of the Map class that supports storing more than
 * 16,777,215 keys by using multiple Map instances internally. This class provides a unified
 * interface to interact with these maps as if it were a single map.
 * 
 * Based on InfinityMap by Fabio Spampinato (https://github.com/fabiospampinato/infinity-map) released under the MIT License.
 */

class XMap {
    #pool;

    /**
     * Creates an instance of XMap.
     * @param {Array} [entries=[]] - Initial set of key-value pairs to add to the map.
     */

    constructor(entries = []) {
        /**
         * @private
         * @type {Array<Map<any, any>>} - Array of Map instances used to store key-value pairs.
         */
        this.#pool = [new Map(entries)];
    }

    /**
     * Gets the total number of key-value pairs across all maps.
     * @return {number} The total number of key-value pairs.
     */
    get size() {
        return this.#pool.reduce((sum, map) => sum + map.size, 0);
    }

    /**
     * Removes all key-value pairs from the XMap.
     */
    clear() {
        this.#pool = [new Map()];
    }

    /**
     * Deletes a key-value pair from the XMap.
     * @param {any} key - The key of the element to remove.
     * @return {boolean} True if an element in the XMap existed and has been removed,
     * or false if the element does not exist.
     */
    delete(key) {
        return this.#pool.some(map => map.delete(key));
    }

    /**
     * Returns a specified element from the XMap.
     * @param {any} key - The key of the element to return.
     * @return {any} The element associated with the specified key, or undefined if the
     * key can't be found in the XMap.
     */
    get(key) {
        for (const map of this.#pool) {
            if (map.has(key)) {
                return map.get(key);
            }
        }
    }

    /**
     * Checks whether an element with the specified key exists in the XMap.
     * @param {any} key - The key to check for.
     * @return {boolean} True if an element with the specified key exists, otherwise false.
     */
    has(key) {
        return this.#pool.some(map => map.has(key));
    }

    /**
     * Sets the value for the key in the XMap.
     * @param {any} key - The key of the element to add.
     * @param {any} value - The value of the element to add.
     * @return {XMap} The XMap instance, allowing for chaining.
     */
    set(key, value) {
        let targetMap = this.#pool[0];

        // First check if the key already exists in any map
        for (const map of this.#pool) {
            if (map.has(key)) {
                targetMap = map;
                break;
            }
        }

        // If this is a new key and the target map is at capacity, create a new one
        if (!targetMap.has(key) && targetMap.size >= 8388608) {
            this.#pool.unshift(new Map());
            targetMap = this.#pool[0];
        }

        targetMap.set(key, value);

        return this;
    }

    /**
     * Creates an iterator that contains all [key, value] pairs for each element in the XMap in insertion order.
     * @return {Iterator} An iterator for the XMap entries.
     */
    *[Symbol.iterator]() {
        for (const map of this.#pool) {
            yield* map;
        }
    }

    /**
     * Creates an iterator that contains the keys for each element in the XMap in insertion order.
     * @return {Iterator} An iterator for the XMap keys.
     */
    *keys() {
        for (const map of this.#pool) {
            yield* map.keys();
        }
    }

    /**
     * Creates an iterator that contains the values for each element in the XMap in insertion order.
     * @return {Iterator} An iterator for the XMap values.
     */
    *values() {
        for (const map of this.#pool) {
            yield* map.values();
        }
    }

    /**
     * Creates an iterator that contains an array of [key, value] for each element in the XMap in insertion order.
     * @return {Iterator} An iterator for the XMap entries.
     */
    *entries() {
        for (const map of this.#pool) {
            yield* map.entries();
        }
    }

    /**
     * Executes a provided function once for each XMap element.
     * @param {Function} callback - Function to execute for each element, taking three arguments:
     * value, key, and the XMap instance.
     * @param {any} [thisArg] - Value to use as this when executing callback.
     */
    forEach(callback, thisArg) {
        for (const [key, value] of this) {
            callback.call(thisArg, value, key, this);
        }
    }
}

module.exports = XMap;
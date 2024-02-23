const assert = require('assert');
const XMap = require('../XMap'); // Adjust the path as necessary

describe('XMap', function() {
    describe('#constructor()', function() {
        it('should initialize empty with no arguments', function() {
            const map = new XMap();
            assert.strictEqual(map.size, 0);
        });

        it('should initialize with provided entries', function() {
            const entries = [['key1', 'value1'], ['key2', 'value2']];
            const map = new XMap(entries);
            assert.strictEqual(map.size, 2);
        });
    });

    describe('#set() and #get()', function() {
        it('should set and get a key-value pair', function() {
            const map = new XMap();
            map.set('key', 'value');
            assert.strictEqual(map.get('key'), 'value');
        });

        it('should overwrite existing key with new value', function() {
            const map = new XMap();
            map.set('key', 'value1');
            map.set('key', 'value2');
            assert.strictEqual(map.get('key'), 'value2');
        });
    });

    describe('#delete()', function() {
        it('should delete a key-value pair and return true if key existed', function() {
            const map = new XMap();
            map.set('key', 'value');
            assert.strictEqual(map.delete('key'), true);
            assert.strictEqual(map.has('key'), false);
        });

        it('should return false if key did not exist', function() {
            const map = new XMap();
            assert.strictEqual(map.delete('nonexistent'), false);
        });
    });

    describe('#size', function() {
        it('should return the correct number of key-value pairs', function() {
            const map = new XMap([['key1', 'value1'], ['key2', 'value2']]);
            assert.strictEqual(map.size, 2);
        });
    });

    describe('#clear()', function() {
        it('should clear all key-value pairs', function() {
            const map = new XMap([['key1', 'value1'], ['key2', 'value2']]);
            map.clear();
            assert.strictEqual(map.size, 0);
        });
    });

    describe('Iteration methods', function() {
        it('should iterate over keys, values, and entries correctly', function() {
            const entries = [['key1', 'value1'], ['key2', 'value2']];
            const map = new XMap(entries);
            const keys = Array.from(map.keys());
            const values = Array.from(map.values());
            const iteratedEntries = Array.from(map.entries());

            assert.deepStrictEqual(keys, ['key1', 'key2']);
            assert.deepStrictEqual(values, ['value1', 'value2']);
            assert.deepStrictEqual(iteratedEntries, entries);
        });
    });

    describe('#forEach()', function() {
        it('should execute a callback for each key-value pair', function() {
            const entries = [['key1', 'value1'], ['key2', 'value2']];
            const map = new XMap(entries);
            let accumulated = [];
            map.forEach((value, key) => accumulated.push([key, value]));

            assert.deepStrictEqual(accumulated, entries);
        });
    });

    // This test is resource-intensive and time-consuming; use with caution.
    describe('handling more than 16,777,215 keys', function() {
        this.timeout(0); // Disable Mocha's timeout as this will take a long time.

        it('should handle more than 16,777,215 keys correctly', function() {
            const limit = 26777300; // One more than the limit
            const map = new XMap();

            // Inserting keys
            for (let i = 0; i < limit; i++) {
                map.set(`key${i}`, `value${i}`);
            }

            // Assert the size is correct
            assert.strictEqual(map.size, limit);

            // Verify retrieval of all keys
            for (let i = 0; i < limit; i++) {
                assert.strictEqual(map.get(`key${i}`), `value${i}`);
            }

            // Verify deletion of all keys
            for (let i = 0; i < limit; i++) {
                assert.strictEqual(map.delete(`key${i}`), true);
            }

            // Assert the map is empty
            assert.strictEqual(map.size, 0);
        });
    });
});

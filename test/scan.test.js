const assert = require('assert');
const kvjs = require('../kv.js'); // Replace './kvjs' with the correct path to your kvjs class

describe('kvjs', function() {
    describe('scan()', function() {
        const instance = new kvjs();

        // Set up sample keys and values
        before(function() {
            instance.set('key1', 'value1');
            instance.set('key2', 'value2');
            instance.set('key3', 'value3');
            instance.set('key4', 'value4');
            instance.set('test1', 'value5');
            instance.set('test2', 'value6');
            instance.set('test3', 'value7');
        });

        it('should return a partial list of keys with the given cursor and count', function() {
            const [nextCursor, keys] = instance.scan(0, '*', 3);

            assert.strictEqual(nextCursor, 3);
            assert.deepStrictEqual(keys, ['key1', 'key2', 'key3']);
        });

        it('should return the remaining keys and a zero cursor when reaching the end', function() {
            const [nextCursor, keys] = instance.scan(3, '*', 4);
            assert.strictEqual(nextCursor, 0);
            assert.deepStrictEqual(keys, ['key4', 'test1', 'test2', 'test3']);
        });

        it('should return an empty list and a zero cursor when starting from the end', function() {
            const [nextCursor, keys] = instance.scan(7, '*', 3);

            assert.strictEqual(nextCursor, 0);
            assert.deepStrictEqual(keys, []);
        });

        it('should return keys that match the given pattern', function() {
            const [nextCursor, keys] = instance.scan(0, 'test*', 10);

            assert.strictEqual(nextCursor, 0);
            assert.deepStrictEqual(keys, ['test1', 'test2', 'test3']);
        });

        it('should return an empty list and a zero cursor when no keys match the pattern', function() {
            const [nextCursor, keys] = instance.scan(0, 'notfound*', 10);

            assert.strictEqual(nextCursor, 0);
            assert.deepStrictEqual(keys, []);
        });

        it('should return an empty list and a zero cursor when the pattern is empty', function() {
            const [nextCursor, keys] = instance.scan(0, '', 10);

            assert.strictEqual(nextCursor, 0);
            assert.deepStrictEqual(keys, []);
        })
    });
});

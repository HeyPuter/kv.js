const assert = require('assert');
const kvjs = require('../kv.js'); // Replace './kvjs' with the correct path to your kvjs class

describe('kvjs', function() {
    describe('mset()', function() {
        const instance = new kvjs();

        it('should set multiple keys with their respective values', function() {
            const result = instance.mset('key1', 'value1', 'key2', 'value2', 'key3', 'value3');

            assert.strictEqual(result, true);
            assert.strictEqual(instance.get('key1'), 'value1');
            assert.strictEqual(instance.get('key2'), 'value2');
            assert.strictEqual(instance.get('key3'), 'value3');
        });

        it('should overwrite existing keys with new values', function() {
            const result = instance.mset('key1', 'newvalue1', 'key2', 'newvalue2');

            assert.strictEqual(result, true);
            assert.strictEqual(instance.get('key1'), 'newvalue1');
            assert.strictEqual(instance.get('key2'), 'newvalue2');
        });

        it('should throw an error when given an odd number of arguments', function() {
            assert.throws(() => {
                instance.mset('key1', 'value1', 'key2');
            }, Error, 'MSET requires an even number of arguments');
        });
    });
});

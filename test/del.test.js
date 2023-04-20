const assert = require('assert').strict;
const kvjs = require('../kv.js');

describe('kvjs', () => {
    let instance;

    beforeEach(() => {
        instance = new kvjs();
    });

    describe('del', () => {
        it('should return 0 for non-existent keys', () => {
            assert.strictEqual(instance.del('non_existent_key'), 0);
        });

        it('should delete an existing key and return 1', () => {
            instance.set('key', 'value');
            assert.strictEqual(instance.del('key'), 1);
            assert.strictEqual(instance.get('key'), undefined);
        });

        it('should return 0 for expired keys', (done) => {
            instance.set('key', 'value', { PX: 50 });
            setTimeout(() => {
                assert.strictEqual(instance.del('key'), 0);
                done();
            }, 60);
        });

        it('should delete multiple keys and return the number of deleted keys', () => {
            instance.set('key1', 'value1');
            instance.set('key2', 'value2');
            instance.set('key3', 'value3');
            assert.strictEqual(instance.del('key1', 'key2', 'non_existent_key'), 2);
            assert.strictEqual(instance.get('key1'), undefined);
            assert.strictEqual(instance.get('key2'), undefined);
            assert.strictEqual(instance.get('key3'), 'value3');
        });
    });
});
